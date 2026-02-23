/// <reference types="bun-types" />
import * as fs from "fs";
import { $ } from "bun";
import { generateK8sManifest, generatePostgresManifest, generateMssqlManifest } from "./manifests.ts";
import { parseK6Output, mergePodMetrics, parseTimeToSeconds, parseConfig, type BenchmarkConfig, type CompetitorConfig } from "./parser.ts";
import { setupMetricsServer } from "./setup-metrics.ts";
import { getPodMetrics, getDbConnectionCount } from "./metrics.ts";

let currentLogMode: "verbose" | "summary" | "silent" = "verbose";
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  if (currentLogMode === "verbose") originalLog(...args);
};
console.error = (...args: any[]) => {
  if (currentLogMode !== "silent") originalError(...args);
};
console.warn = (...args: any[]) => {
  if (currentLogMode !== "silent") originalWarn(...args);
};

const logSummary = (...args: any[]) => {
  if (currentLogMode !== "silent") originalLog(...args);
};

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
    const dbSuffix = suffix;
    const dbDeploymentName = dbType ? `${dbType}-deployment-${dbSuffix}` : "";
    const dbServiceName = dbType ? `${dbType}-service-${dbSuffix}` : "";
    const dbAppLabel = dbType ? `${dbType}-${dbSuffix}` : "";

    // 2. Deploy required database for this competitor
    if (dbType === "postgres") {
      console.log(`[${competitor}] ☸️  Deploying PostgreSQL database (${dbServiceName})...`);
      const pgManifest = generatePostgresManifest(config.databaseResources, dbSuffix);
      const pgManifestPath = `/tmp/postgres-manifest-${dbSuffix}.yml`;
      fs.writeFileSync(pgManifestPath, pgManifest);
      if (isVerbose) {
        await $`kubectl apply -f ${pgManifestPath}`;
      } else {
        await $`kubectl apply -f ${pgManifestPath}`.quiet();
      }
      console.log(`[${competitor}] ⏳ Waiting for PostgreSQL to be ready...`);
      if (isVerbose) {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=120s`;
      } else {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=120s`.quiet();
      }
      console.log(`[${competitor}] ✅ PostgreSQL ready.`);
    } else if (dbType === "mssql") {
      console.log(`[${competitor}] ☸️  Deploying MSSQL database (${dbServiceName})...`);
      const mssqlManifest = generateMssqlManifest(config.databaseResources, dbSuffix);
      const mssqlManifestPath = `/tmp/mssql-manifest-${dbSuffix}.yml`;
      fs.writeFileSync(mssqlManifestPath, mssqlManifest);
      if (isVerbose) {
        await $`kubectl apply -f ${mssqlManifestPath}`;
      } else {
        await $`kubectl apply -f ${mssqlManifestPath}`.quiet();
      }
      console.log(`[${competitor}] ⏳ Waiting for MSSQL to be ready...`);
      if (isVerbose) {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=300s`;
      } else {
        await $`kubectl rollout status deployment/${dbDeploymentName} --timeout=300s`.quiet();
      }
      console.log(`[${competitor}] ✅ MSSQL ready.`);
    }

    // Wait for the database to settle if one was deployed
    if (dbType) {
      const settleDurationStr = config.test.databaseSettleDuration || (dbType === "mssql" ? "30s" : "15s");
      const settleTimeMs = parseTimeToSeconds(settleDurationStr) * 1000;
      console.log(`[${competitor}] ⏳ Waiting ${settleDurationStr} for database to settle...`);
      await new Promise(resolve => setTimeout(resolve, settleTimeMs));
    }

    // 3. Build Docker Image
    console.log(`[${competitor}] 🐳 Building Docker image...`);
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
    console.log(`[${competitor}] ✅ Docker image built successfully.`);

    // 4 & 5. Generate and Apply Kubernetes Manifests
    console.log(`\n[${competitor}] ☸️  Deploying to Kubernetes...`);

    // Inject Database Host properly
    const env = { ...(competitorConfig.env || {}) };

    // Replace 'postgres-service' or 'mssql-service' placeholders with the actual dbServiceName in all env vars
    for (const key of Object.keys(env)) {
      const valStr = String(env[key]);
      if (dbType === "postgres" && valStr.includes("postgres-service")) {
        env[key] = valStr.replace("postgres-service", dbServiceName);
      } else if (dbType === "mssql" && valStr.includes("mssql-service")) {
        env[key] = valStr.replace("mssql-service", dbServiceName);
      }
    }

    // Set a default DATABASE_URL only if missing entirely
    if (dbType === "postgres" && !env["DATABASE_URL"]) {
      env["DATABASE_URL"] = `postgres://postgres:benchmark@${dbServiceName}:5432/benchmark?sslmode=disable`;
    } else if (dbType === "mssql" && !env["DATABASE_URL"]) {
      env["DATABASE_URL"] = `Server=${dbServiceName},1433;Database=benchmark;User Id=sa;Password=Benchmark123!;Encrypt=False;TrustServerCertificate=True;Connection Timeout=30;Min Pool Size=1;Max Pool Size=100;`;
    }

    const k8sManifest = generateK8sManifest(competitor, config.resources, env);
    const manifestPath = `/tmp/${competitor}-manifest.yml`;
    fs.writeFileSync(manifestPath, k8sManifest);

    if (isVerbose) {
      await $`kubectl apply -f ${manifestPath}`;
    } else {
      await $`kubectl apply -f ${manifestPath}`.quiet();
    }
    console.log(`[${competitor}] ⏳ Waiting for deployment to be ready...`);

    // Wait for rollout
    if (isVerbose) {
      await $`kubectl rollout status deployment/${competitor}-deployment --timeout=300s`;
    } else {
      await $`kubectl rollout status deployment/${competitor}-deployment --timeout=300s`.quiet();
    }
    console.log(`[${competitor}] ✅ Deployment ready.`);

    // Wait a few seconds for load balancer/service routing to settle
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Iterate through every test type requested in bench.config.yml
    for (const testType of config.test.types) {
      let endpoint = '/plaintext';
      if (testType === 'json') {
        endpoint = '/json';
      } else if (testType === 'single-read') {
        endpoint = '/single-read';
      } else if (testType === 'multiple-read') {
        endpoint = '/multiple-read';
      } else if (testType === 'single-create') {
        endpoint = '/single-create';
      } else if (testType === 'multiple-create') {
        endpoint = '/multiple-create';
      } else if (testType === 'single-update') {
        endpoint = '/single-update';
      } else if (testType === 'multiple-update') {
        endpoint = '/multiple-update';
      } else if (testType === 'single-delete') {
        endpoint = '/single-delete';
      } else if (testType === 'multiple-delete') {
        endpoint = '/multiple-delete';
      }
      const targetUrl = `http://${competitor}-service${endpoint}`;
      const sanitizedTestType = testType.replace(/\//g, "-");

      // --- WARMUP PHASE ---
      const warmupDuration = config.test.warmupDuration || "30s";
      const warmupSecs = parseTimeToSeconds(warmupDuration);
      const scriptContent = fs.readFileSync("./scripts/k6-test.ts", "utf8");
      if (warmupSecs > 0) {
        console.log(`\n[${competitor}] 🔥 Warming up for '${testType}' (${warmupDuration})...`);
        try {
          await $`echo ${scriptContent} | kubectl run k6-warmup-${competitor}-${sanitizedTestType} --rm -i \
                        --image=grafana/k6 \
                        --restart=Never \
                        -- run -e TARGET_URL=${targetUrl} -e TEST_TYPE=${testType} --vus=${config.test.vus} --duration=${warmupSecs}s -`.quiet();
        } catch (e) {
          console.warn(`[${competitor}] ⚠️ Warmup failed (ignoring):`, e);
        }
      } else {
        console.log(`\n[${competitor}] ⏩ Skipping warmup for '${testType}' (duration is ${warmupDuration})`);
      }

      const idleWaitDurationStr = config.test.idleWaitDuration || "15s";
      const idleWaitMs = parseTimeToSeconds(idleWaitDurationStr) * 1000;
      if (idleWaitMs > 0) {
        console.log(`[${competitor}] ⏳ Waiting ${idleWaitDurationStr} for resources to settle before test...`);
        await new Promise(resolve => setTimeout(resolve, idleWaitMs));
      } else {
        console.log(`[${competitor}] ⏩ Skipping idle wait for '${testType}' (duration is ${idleWaitDurationStr})`);
      }

      // Capture Idle metrics before test
      const idleMetrics = await getPodMetrics(competitor);
      const idleDbMetrics = dbType ? await getPodMetrics(dbAppLabel) : { cpu: 0, memory: 0 };
      const idleConnections = dbType ? await getDbConnectionCount(dbDeploymentName, dbType) : 0;
      console.log(`[${competitor}] 💤 Idle Metrics -> App CPU: ${idleMetrics.cpu}m, App RAM: ${idleMetrics.memory}Mi | DB CPU: ${idleDbMetrics.cpu}m, DB RAM: ${idleDbMetrics.memory}Mi, Connections: ${idleConnections}`);

      // --- ACTUAL TEST PHASE ---
      console.log(`[${competitor}] 🧨 Running load test '${testType}' with 'k6' for ${config.test.duration}...`);

      // Run k6 and capture output. We run it as a standalone Pod passing script via stdin.
      const testDurationSecs = parseTimeToSeconds(config.test.duration);
      const k6Command = `k6 run --vus ${config.test.vus} --duration ${testDurationSecs}s -e TARGET_URL=${targetUrl} -e TEST_TYPE=${testType}`;
      console.log(`[${competitor}] Executing: ${k6Command} from inside cluster...`);

      // Ensure any leftover pod is deleted
      await $`kubectl delete pod k6-test-${competitor}-${sanitizedTestType} --ignore-not-found`.quiet();

      // Start tracking peak metrics in the background
      let peakCpu = 0;
      let peakMemory = 0;
      let peakDbCpu = 0;
      let peakDbMemory = 0;
      let peakConnections = 0;
      let testRunning = true;

      const metricInterval = setInterval(async () => {
        if (!testRunning) return;
        const [m, dbM, c] = await Promise.all([
          getPodMetrics(competitor),
          dbType ? getPodMetrics(dbAppLabel) : Promise.resolve({ cpu: 0, memory: 0 }),
          dbType ? getDbConnectionCount(dbDeploymentName, dbType) : Promise.resolve(0)
        ]);
        if (m.cpu > peakCpu) peakCpu = m.cpu;
        if (m.memory > peakMemory) peakMemory = m.memory;
        if (dbM.cpu > peakDbCpu) peakDbCpu = dbM.cpu;
        if (dbM.memory > peakDbMemory) peakDbMemory = dbM.memory;
        if (c !== undefined && peakConnections !== undefined && c > peakConnections) peakConnections = c;
      }, 1000);

      const testOutput = await $`echo ${scriptContent} | kubectl run k6-test-${competitor}-${sanitizedTestType} --rm -i \
          --image=grafana/k6 \
          --restart=Never \
          -- run -e TARGET_URL=${targetUrl} -e TEST_TYPE=${testType} --vus=${config.test.vus} --duration=${testDurationSecs}s -`.text();

      testRunning = false;
      clearInterval(metricInterval);

      console.log(`[${competitor}] 📊 Load test '${testType}' complete.`);
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

      finalReport[competitor][testType] = metrics;
      console.log(`[${competitor}] 📈 Metrics (${testType}):`, metrics);

      // Wait 5 seconds between separate tests for DNS/sockets to flush
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    logSummary(`[${competitor}] ✅ All tests complete.`);
  } catch (error) {
    console.error(`[${competitor}] ❌ Benchmark failed:`, error);
    finalReport[competitor].error = String(error);
  } finally {
    // 6. Cleanup competitor and database
    console.log(`[${competitor}] 🧹 Cleaning up resources...`);
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

  logSummary(`🚀 Starting Benchmark Orchestration Pipeline at ${startTime}`);

  // Setup metrics server
  await setupMetricsServer();

  logSummary(`Loaded config for ${config.competitors.length} competitors. Test duration: ${config.test.duration}/type.`);
  logSummary(`Concurrency level: ${config.test.concurrency}`);

  const finalReport: Record<string, any> = {};

  const competitors = [...config.competitors];
  const concurrency = config.test.concurrency || 1;
  const activePromises: Promise<void>[] = [];

  for (const competitorConfig of competitors) {
    // If we've reached max concurrency, wait for one to finish
    if (activePromises.length >= concurrency) {
      await Promise.race(activePromises);
      // Remove finished promises
      // This is a bit naive but works for small concurrency
      for (let i = 0; i < activePromises.length; i++) {
        // @ts-ignore - check if promise is resolved (not possible directly, so we filter by actual completion)
      }
    }

    const promise = runCompetitor(competitorConfig, config, finalReport).then(() => {
      activePromises.splice(activePromises.indexOf(promise), 1);
    });
    activePromises.push(promise);
  }

  // Wait for all remaining competitors to finish
  await Promise.all(activePromises);

  // 7. Output Report
  logSummary(`\n======================================================`);
  const reportDir = "reports";
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  const reportPath = `${reportDir}/${startTime.replace(/:/g, '-')}.json`;
  logSummary(`🎉 All benchmarks complete. Writing ${reportPath}`);
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
