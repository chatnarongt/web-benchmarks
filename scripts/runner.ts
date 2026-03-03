/// <reference types="bun-types" />
import * as fs from "fs";
import { $ } from "bun";
import { generateK8sManifest, generatePostgresManifest, generateMssqlManifest } from "./manifests.ts";
import { parseK6Output, parseK6Errors, mergePodMetrics, parseTimeToSeconds, parseConfig, type BenchmarkConfig, type CompetitorConfig } from "./parser.ts";
import { buildEnv } from "./env-builder.ts";
import { setupMetricsServer } from "./setup-metrics.ts";
import { getPodMetrics, getDbConnectionCount } from "./metrics.ts";

let currentLogMode: NonNullable<BenchmarkConfig['test']['logMode']> = "info";

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.debug = (...args: any[]) => {
  // verbose only
  if (currentLogMode === "verbose") originalLog(...args);
};
console.info = (...args: any[]) => {
  // verbose and info
  if (["verbose", "info"].includes(currentLogMode)) originalLog(...args);
};
console.log = (...args: any[]) => {
  // verbose, info, and summary
  if (["verbose", "info", "summary"].includes(currentLogMode)) originalLog(...args);
};
console.warn = (...args: any[]) => {
  // all except silent
  if (currentLogMode !== "silent") originalWarn(...args);
};
console.error = (...args: any[]) => {
  // silent only
  if (currentLogMode === "silent") originalError(...args);
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`]
    .filter(Boolean)
    .join(' ');
}

/**
 * Runs a k6 load test inside a Kubernetes pod using a ConfigMap-mounted script.
 *
 * Instead of piping the script via stdin (which requires a persistent TCP
 * attach connection that Docker Desktop can silently drop on long tests),
 * we store the script in a ConfigMap, mount it into the pod, and poll for
 * completion.  This is fully resilient to network interruptions.
 */
async function runK6Pod(
  podName: string,
  scriptContent: string,
  k6Args: string[],
  timeoutSecs: number,
  label?: string,
): Promise<string> {
  const configMapName = `${podName}-script`;
  const tmpScriptPath = `/tmp/${configMapName}.js`;
  const manifestPath = `/tmp/${podName}-pod.json`;

  try {
    // 1. Write script to a temp file and create/update ConfigMap
    fs.writeFileSync(tmpScriptPath, scriptContent);
    await $`timeout 15 kubectl create configmap ${configMapName} --from-file=script.ts=${tmpScriptPath} --dry-run=client -o yaml | kubectl apply -f -`.quiet();

    // 2. Generate Pod manifest with the ConfigMap mounted
    const podManifest = JSON.stringify({
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: podName },
      spec: {
        restartPolicy: "Never",
        containers: [{
          name: "k6",
          image: "grafana/k6",
          args: ["run", ...k6Args, "/scripts/script.ts"],
          volumeMounts: [{ name: "k6-script", mountPath: "/scripts", readOnly: true }],
        }],
        volumes: [{ name: "k6-script", configMap: { name: configMapName } }],
      },
    });
    fs.writeFileSync(manifestPath, podManifest);

    // 3. Clean up any leftover pod, then create the new one
    await $`timeout 15 kubectl delete pod ${podName} --ignore-not-found`.quiet();
    await $`timeout 15 kubectl apply -f ${manifestPath}`.quiet();

    // 4. Poll for pod completion (no persistent connection needed)
    const deadline = Date.now() + timeoutSecs * 1000;
    const startTime = Date.now();
    let phase = "";
    let lastLogTime = 0;
    while (Date.now() < deadline) {
      try {
        // Use timeout on kubectl to prevent a single call from hanging the loop
        phase = (await $`timeout 10 kubectl get pod ${podName} -o jsonpath='{.status.phase}'`.text())
          .trim().replace(/'/g, '');
        if (phase === "Succeeded" || phase === "Failed") break;
      } catch { /* pod may not exist yet or kubectl timed out */ }

      // Log progress every 30s so the user knows it's not stuck
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed - lastLogTime >= 30) {
        lastLogTime = elapsed;
        const tag = label ? `[${label}] ` : '';
        console.debug(`${tag}⏳ k6 pod '${podName}' still running... (${formatDuration(elapsed)} elapsed, phase: ${phase || 'Pending'})`);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    if (phase !== "Succeeded" && phase !== "Failed") {
      throw new Error(`Pod ${podName} timed out after ${timeoutSecs}s (last phase: ${phase})`);
    }

    // 5. Capture logs (with timeout to prevent hanging on large output)
    try {
      return await $`timeout 30 kubectl logs ${podName}`.text();
    } catch {
      return "";
    }
  } finally {
    // 6. Cleanup pod, configmap, temp files
    await $`timeout 10 kubectl delete pod ${podName} --ignore-not-found --force --grace-period=0`.quiet().catch(() => { });
    await $`timeout 10 kubectl delete configmap ${configMapName} --ignore-not-found`.quiet().catch(() => { });
    try { fs.unlinkSync(tmpScriptPath); } catch { }
    try { fs.unlinkSync(manifestPath); } catch { }
  }
}

async function runCompetitor(competitorConfig: CompetitorConfig, config: BenchmarkConfig, finalReport: Record<string, any>) {
  const isVerbose = config.test.logMode === "verbose";
  const competitor = competitorConfig.name;
  const dbType = competitorConfig.database;
  const suffix = competitor.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  console.log(`\n======================================================`);
  console.log(`[${competitor}] 🏁 Starting Benchmark`);
  console.log(`======================================================`);

  finalReport[competitor] = {};

  try {
    const competitorStartTime = Date.now();
    const dbSuffix = suffix;
    const dbDeploymentName = dbType ? `${dbType}-deployment-${dbSuffix}` : "";
    const dbServiceName = dbType ? `${dbType}-service-${dbSuffix}` : "";
    const dbAppLabel = dbType ? `${dbType}-${dbSuffix}` : "";

    // 1. Build Docker Image
    console.info(`[${competitor}] 🐳 Building Docker image...`);
    const buildArgs: string[] = [];
    if (competitorConfig.env) {
      for (const [key, value] of Object.entries(competitorConfig.env)) {
        buildArgs.push("--build-arg");
        buildArgs.push(`${key}=${value}`);
      }
    }
    if (isVerbose) {
      await $`docker build ${buildArgs} -t ${competitor}:benchmark ./competitors/${competitor}`;
    } else {
      await $`docker build ${buildArgs} -t ${competitor}:benchmark ./competitors/${competitor}`.quiet();
    }
    console.info(`[${competitor}] ✅ Docker image built successfully.`);

    // 2. Deploy required database for this competitor
    if (dbType === "postgres") {
      console.info(`[${competitor}] ☸️  Deploying PostgreSQL database (${dbServiceName})...`);
      const pgManifest = generatePostgresManifest(config.databaseResources, dbSuffix, config.test.vus);
      const pgManifestPath = `/tmp/postgres-manifest-${dbSuffix}.yml`;
      fs.writeFileSync(pgManifestPath, pgManifest);
      if (isVerbose) {
        await $`kubectl apply -f ${pgManifestPath}`;
      } else {
        await $`kubectl apply -f ${pgManifestPath}`.quiet();
      }
      console.debug(`[${competitor}] ⏳ Waiting for PostgreSQL to be ready...`);
      if (isVerbose) {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=120s`;
      } else {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=120s`.quiet();
      }
      console.info(`[${competitor}] ✅ PostgreSQL ready.`);
    } else if (dbType === "mssql") {
      console.info(`[${competitor}] ☸️  Deploying MSSQL database (${dbServiceName})...`);
      const mssqlManifest = generateMssqlManifest(config.databaseResources, dbSuffix, config.test.vus);
      const mssqlManifestPath = `/tmp/mssql-manifest-${dbSuffix}.yml`;
      fs.writeFileSync(mssqlManifestPath, mssqlManifest);
      if (isVerbose) {
        await $`kubectl apply -f ${mssqlManifestPath}`;
      } else {
        await $`kubectl apply -f ${mssqlManifestPath}`.quiet();
      }
      console.debug(`[${competitor}] ⏳ Waiting for MSSQL to be ready...`);
      if (isVerbose) {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=300s`;
      } else {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=300s`.quiet();
      }
      console.info(`[${competitor}] ✅ MSSQL ready.`);
    }

    // Wait for the database to settle if one was deployed
    if (dbType) {
      let settleTimeMs = 0;
      let settleDurationStr = config.test.databaseSettleDuration;

      if (!settleDurationStr || settleDurationStr === 'auto') {
        // Base setup time
        const baseDelayMs = dbType === "mssql" ? 20000 : 10000;
        // 200k rows takes ~0.5 - 1s to seed in MSSQL. Add 800ms per VU to be safe.
        const perVuDelayMs = config.test.vus * 800;

        settleTimeMs = baseDelayMs + perVuDelayMs;
        settleDurationStr = `${Math.ceil(settleTimeMs / 1000)}s (dynamic based on ${config.test.vus} VUs)`;
      } else {
        settleTimeMs = parseTimeToSeconds(settleDurationStr) * 1000;
      }

      console.debug(`[${competitor}] ⏳ Waiting ${settleDurationStr} for database to settle...`);
      await new Promise(resolve => setTimeout(resolve, settleTimeMs));
    }

    // 4 & 5. Generate and Apply Kubernetes Manifests
    console.debug('');
    console.info(`[${competitor}] ☸️  Deploying to Kubernetes...`);

    const env = buildEnv(competitorConfig, dbServiceName);

    const k8sManifest = generateK8sManifest(competitor, config.resources, env);
    const manifestPath = `/tmp/${competitor}-manifest.yml`;
    fs.writeFileSync(manifestPath, k8sManifest);

    if (isVerbose) {
      await $`kubectl apply -f ${manifestPath}`;
    } else {
      await $`kubectl apply -f ${manifestPath}`.quiet();
    }
    console.debug(`[${competitor}] ⏳ Waiting for deployment to be ready...`);

    // Wait for rollout
    if (isVerbose) {
      await $`kubectl rollout status deployment/${competitor}-deployment --timeout=300s`;
    } else {
      await $`kubectl rollout status deployment/${competitor}-deployment --timeout=300s`.quiet();
    }
    console.info(`[${competitor}] ✅ Deployment ready.`);

    // Wait a few seconds for load balancer/service routing to settle
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Iterate through every test type requested in bench.config.yml
    for (const testType of config.test.types) {
      let endpoint = '/plaintext';
      if (testType === 'json-serialization') {
        endpoint = '/json-serialization';
      } else if (testType === 'read-one') {
        endpoint = '/read-one';
      } else if (testType === 'read-many') {
        endpoint = '/read-many';
      } else if (testType === 'create-one') {
        endpoint = '/create-one';
      } else if (testType === 'create-many') {
        endpoint = '/create-many';
      } else if (testType === 'update-one') {
        endpoint = '/update-one';
      } else if (testType === 'update-many') {
        endpoint = '/update-many';
      } else if (testType === 'delete-one') {
        endpoint = '/delete-one';
      } else if (testType === 'delete-many') {
        endpoint = '/delete-many';
      }
      const targetUrl = `http://${competitor}-service${endpoint}`;
      const sanitizedTestType = testType.replace(/\//g, "-");

      // --- WARMUP PHASE ---
      const warmupDuration = config.test.warmupDuration || "30s";
      const warmupSecs = parseTimeToSeconds(warmupDuration);
      const scriptContent = fs.readFileSync("./scripts/k6-test.ts", "utf8");

      const rawWarmupName = `k6-w-${competitor}-${sanitizedTestType}`;
      const warmupPodName = rawWarmupName.substring(0, 63).replace(/-+$/, '').toLowerCase();

      if (warmupSecs > 0) {
        console.debug('');
        console.info(`[${competitor}] 🔥 Warming up for '${testType}' (${warmupDuration})...`);
        const warmupTimeoutSecs = warmupSecs + 120;
        try {
          await runK6Pod(warmupPodName, scriptContent, [
            "-e", `TARGET_URL=${targetUrl}`,
            "-e", `TEST_TYPE=${testType}`,
            `--vus=${config.test.vus}`,
            `--duration=${warmupSecs}s`,
          ], warmupTimeoutSecs, competitor);
        } catch (e) {
          console.warn(`[${competitor}] ⚠️ Warmup failed or timed out (ignoring):`, e);
        }
      } else {
        console.debug('');
        console.debug(`[${competitor}] ⏩ Skipping warmup for '${testType}' (duration is ${warmupDuration})`);
      }

      const idleWaitDurationStr = config.test.idleWaitDuration || "15s";
      const idleWaitMs = parseTimeToSeconds(idleWaitDurationStr) * 1000;
      if (idleWaitMs > 0) {
        console.debug(`[${competitor}] ⏳ Waiting ${idleWaitDurationStr} for resources to settle before test...`);
        await new Promise(resolve => setTimeout(resolve, idleWaitMs));
      } else {
        console.debug(`[${competitor}] ⏩ Skipping idle wait for '${testType}' (duration is ${idleWaitDurationStr})`);
      }

      // Capture Idle metrics before test
      const idleMetrics = await getPodMetrics(competitor);
      const idleDbMetrics = dbType ? await getPodMetrics(dbAppLabel) : { cpu: 0, memory: 0 };
      const idleConnections = dbType ? await getDbConnectionCount(dbDeploymentName, dbType, competitor) : 0;
      console.debug(`[${competitor}] 💤 Idle Metrics -> App CPU: ${idleMetrics.cpu}m, App RAM: ${idleMetrics.memory}Mi | DB CPU: ${idleDbMetrics.cpu}m, DB RAM: ${idleDbMetrics.memory}Mi, Connections: ${idleConnections}`);

      // --- ACTUAL TEST PHASE ---
      const rawTestName = `k6-t-${competitor}-${sanitizedTestType}`;
      const testPodName = rawTestName.substring(0, 63).replace(/-+$/, '').toLowerCase();

      const testDurationSecs = parseTimeToSeconds(config.test.duration);
      console.info(`[${competitor}] 🧨 Running load test '${testType}' with 'k6' for ${config.test.duration}...`);
      console.debug(`[${competitor}] Executing: k6 run --vus ${config.test.vus} --duration ${testDurationSecs}s -e TARGET_URL=${targetUrl} -e TEST_TYPE=${testType} from inside cluster...`);

      // Start tracking peak metrics in the background.
      // Seed with idle values so that if kubectl top transiently fails during
      // polling the recorded peak is never lower than the pre-test baseline.
      let peakCpu = idleMetrics.cpu;
      let peakMemory = idleMetrics.memory;
      let peakDbCpu = idleDbMetrics.cpu;
      let peakDbMemory = idleDbMetrics.memory;
      let peakConnections = idleConnections;
      let testRunning = true;

      const metricLoop = async () => {
        while (testRunning) {
          try {
            const [m, dbM, c] = await Promise.all([
              getPodMetrics(competitor),
              dbType ? getPodMetrics(dbAppLabel) : Promise.resolve({ cpu: 0, memory: 0 }),
              dbType ? getDbConnectionCount(dbDeploymentName, dbType, competitor) : Promise.resolve(0)
            ]);
            if (!testRunning) break;
            if (m.cpu > peakCpu) peakCpu = m.cpu;
            if (m.memory > peakMemory) peakMemory = m.memory;
            if (dbM.cpu > peakDbCpu) peakDbCpu = dbM.cpu;
            if (dbM.memory > peakDbMemory) peakDbMemory = dbM.memory;
            if (c !== undefined && peakConnections !== undefined && c > peakConnections) peakConnections = c;
          } catch (e) {
            // ignore network/timeout metric errors
          }
          if (testRunning) await new Promise(r => setTimeout(r, 1000));
        }
      };
      const metricsPromise = metricLoop();

      const testTimeoutSecs = testDurationSecs + 120;
      let testOutput: string;
      try {
        testOutput = await runK6Pod(testPodName, scriptContent, [
          "--log-output=stdout",
          "-e", `TARGET_URL=${targetUrl}`,
          "-e", `TEST_TYPE=${testType}`,
          `--vus=${config.test.vus}`,
          `--duration=${testDurationSecs}s`,
        ], testTimeoutSecs, competitor);
      } catch (e) {
        console.warn(`[${competitor}] ⚠️ Load test '${testType}' timed out or failed:`, e);
        testOutput = String(e);
      }

      testRunning = false;
      // Give metrics loop a short window to exit; don't block forever if
      // a kubectl call inside the loop is hung.
      await Promise.race([
        metricsPromise,
        new Promise(r => setTimeout(r, 5000))
      ]);

      console.info(`[${competitor}] 📊 Load test '${testType}' complete.`);
      const errorSamples = parseK6Errors(testOutput);
      let metrics = parseK6Output(testOutput);
      metrics = mergePodMetrics(
        metrics,
        idleMetrics.cpu, peakCpu,
        idleMetrics.memory, peakMemory,
        idleConnections, peakConnections,
        idleDbMetrics.cpu, peakDbCpu,
        idleDbMetrics.memory, peakDbMemory,
        config.resources.limits,
        config.databaseResources.limits
      );

      const report: any = { ...metrics };
      if (errorSamples.length > 0) report.errors = errorSamples;
      finalReport[competitor][testType] = report;
      console.debug(`[${competitor}] 📈 Metrics (${testType}):`);
      console.debug(metrics);

      // Wait 5 seconds between separate tests for DNS/sockets to flush
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log(`[${competitor}] ✅ All tests complete.`);
    console.log(`======================================================`);
    console.log(`[${competitor}] 🏁 Completed in ${formatDuration(Math.round((Date.now() - competitorStartTime) / 1000))}.`);
    console.log(`======================================================`);
  } catch (error) {
    console.error(`[${competitor}] ❌ Benchmark failed:`, error);
    finalReport[competitor].error = String(error);
  } finally {
    // 6. Cleanup competitor and database
    console.debug(`[${competitor}] 🧹 Cleaning up resources...`);
    try {
      const dbSuffix = suffix;
      // Cleanup competitor
      if (isVerbose) {
        await $`kubectl delete deployment ${competitor}-deployment --ignore-not-found`;
        await $`kubectl delete service ${competitor}-service --ignore-not-found`;
      } else {
        await $`kubectl delete deployment ${competitor}-deployment --ignore-not-found`.quiet();
        await $`kubectl delete service ${competitor}-service --ignore-not-found`.quiet();
      }

      // Cleanup database
      if (dbType === "postgres") {
        if (isVerbose) {
          await $`kubectl delete deployment postgres-deployment-${dbSuffix} --ignore-not-found`;
          await $`kubectl delete service postgres-service-${dbSuffix} --ignore-not-found`;
          await $`kubectl delete configmap postgres-init-script-${dbSuffix} --ignore-not-found`;
          await $`rm -f /tmp/postgres-manifest-${dbSuffix}.yml`;
        } else {
          await $`kubectl delete deployment postgres-deployment-${dbSuffix} --ignore-not-found`.quiet();
          await $`kubectl delete service postgres-service-${dbSuffix} --ignore-not-found`.quiet();
          await $`kubectl delete configmap postgres-init-script-${dbSuffix} --ignore-not-found`.quiet();
          await $`rm -f /tmp/postgres-manifest-${dbSuffix}.yml`.quiet();
        }
      } else if (dbType === "mssql") {
        if (isVerbose) {
          await $`kubectl delete deployment mssql-deployment-${dbSuffix} --ignore-not-found`;
          await $`kubectl delete service mssql-service-${dbSuffix} --ignore-not-found`;
          await $`kubectl delete configmap mssql-init-script-${dbSuffix} --ignore-not-found`;
          await $`rm -f /tmp/mssql-manifest-${dbSuffix}.yml`;
        } else {
          await $`kubectl delete deployment mssql-deployment-${dbSuffix} --ignore-not-found`.quiet();
          await $`kubectl delete service mssql-service-${dbSuffix} --ignore-not-found`.quiet();
          await $`kubectl delete configmap mssql-init-script-${dbSuffix} --ignore-not-found`.quiet();
          await $`rm -f /tmp/mssql-manifest-${dbSuffix}.yml`.quiet();
        }
      }
    } catch (e) {
      console.error(`[${competitor}] Cleanup error:`, e);
    }
  }
}

async function main() {
  const startTime = new Date().toISOString();

  // 1. Parse configuration
  let config: BenchmarkConfig;
  try {
    config = parseConfig("bench.config.yml");
  } catch (e: any) {
    console.error(`- Error: ${e.message}`);
    return;
  }

  if (config.test.logMode) {
    currentLogMode = config.test.logMode;
  }

  console.log(`🚀 Starting Benchmark Orchestration Pipeline at ${startTime}`);

  // Setup metrics server
  await setupMetricsServer();

  console.log(`Loaded config for ${config.competitors.length} competitors. Test duration: ${config.test.duration}/type.`);
  console.log(`Concurrency level: ${config.test.concurrency}`);

  const finalReport: Record<string, any> = {};

  const competitors = [...config.competitors];
  const concurrency = config.test.concurrency || 1;
  const activePromises: Promise<void>[] = [];

  for (const competitorConfig of competitors) {
    // If we've reached max concurrency, wait for one to finish
    if (activePromises.length >= concurrency) {
      await Promise.race(activePromises);
    }

    const promise = runCompetitor(competitorConfig, config, finalReport).then(() => {
      activePromises.splice(activePromises.indexOf(promise), 1);
    });
    activePromises.push(promise);
  }

  // Wait for all remaining competitors to finish
  await Promise.all(activePromises);

  // 7. Output Report
  const reportDir = "reports";
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  const reportPath = `${reportDir}/${startTime.replace(/:/g, '-')}.json`;
  console.info("");
  console.log(`🎉 All benchmarks complete. Writing ${reportPath}`);
  const endTime = new Date().toISOString();
  const exportReport = {
    startTime,
    endTime,
    configs: config,
    result: finalReport
  };
  fs.writeFileSync(reportPath, JSON.stringify(exportReport, null, 2));
}

main().catch(console.error);
