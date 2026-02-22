/// <reference types="bun-types" />
import * as fs from "fs";
import * as yaml from "js-yaml";
import { $ } from "bun";
import { generateK8sManifest, generatePostgresManifest, generateMssqlManifest } from "./manifests.ts";
import { parseWrkOutput, mergePodMetrics, parseTimeToSeconds } from "./parser.ts";
import { setupMetricsServer } from "./setup-metrics.ts";
import { getPodMetrics, getDbConnectionCount } from "./metrics.ts";

interface CompetitorConfig {
    name: string;
    database?: "postgres" | "mssql";
}

interface BenchmarkConfig {
    competitors: CompetitorConfig[];
    test: {
        types: string[];
        concurrency: number;
        connections: number;
        duration: string;
        warmupDuration: string;
        idleWaitDuration: string;
        databaseSettleDuration: string;
        threads: number;
    };
    resources: {
        replicas: number;
        requests: { cpu: string; memory: string };
        limits: { cpu: string; memory: string };
    };
    databaseResources: {
        requests: { cpu: string; memory: string };
        limits: { cpu: string; memory: string };
    };
}

async function main() {
    const startTime = new Date().toISOString();
    console.log(`🚀 Starting Benchmark Orchestration Pipeline at ${startTime}`);

    // Setup metrics server
    await setupMetricsServer();

    // 1. Parse configuration
    const fileContents = fs.readFileSync("bench.config.yml", "utf8");
    const config = yaml.load(fileContents) as BenchmarkConfig;

    console.log(`Loaded config for ${config.competitors.length} competitors. Test duration: ${config.test.duration}/type.`);

    const finalReport: Record<string, any> = {};

    // For now we assume sequential execution (concurrency = 1)
    for (const competitorConfig of config.competitors) {
        const competitor = competitorConfig.name;
        const dbType = competitorConfig.database;

        console.log(`\n======================================================`);
        console.log(`[${competitor}] 🏁 Starting Benchmark`);
        console.log(`======================================================`);

        finalReport[competitor] = {};

        try {
            // 2. Deploy required database for this competitor
            if (dbType === "postgres") {
                console.log(`[${competitor}] ☸️  Deploying PostgreSQL database...`);
                const pgManifest = generatePostgresManifest(config.databaseResources);
                const pgManifestPath = `/tmp/postgres-manifest.yml`;
                fs.writeFileSync(pgManifestPath, pgManifest);
                await $`kubectl apply -f ${pgManifestPath}`;
                console.log(`[${competitor}] ⏳ Waiting for PostgreSQL to be ready...`);
                await $`kubectl rollout status deployment/postgres-deployment --timeout=120s`;
                console.log(`[${competitor}] ✅ PostgreSQL ready.`);
            } else if (dbType === "mssql") {
                console.log(`[${competitor}] ☸️  Deploying MSSQL database...`);
                const mssqlManifest = generateMssqlManifest(config.databaseResources);
                const mssqlManifestPath = `/tmp/mssql-manifest.yml`;
                fs.writeFileSync(mssqlManifestPath, mssqlManifest);
                await $`kubectl apply -f ${mssqlManifestPath}`;
                console.log(`[${competitor}] ⏳ Waiting for MSSQL to be ready...`);
                await $`kubectl rollout status deployment/mssql-deployment --timeout=300s`;
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
            await $`docker build -t ${competitor}:benchmark ./competitors/${competitor}`;
            console.log(`[${competitor}] ✅ Docker image built successfully.`);

            // 4 & 5. Generate and Apply Kubernetes Manifests
            console.log(`\n[${competitor}] ☸️  Deploying to Kubernetes...`);
            const k8sManifest = generateK8sManifest(competitor, config.resources);
            const manifestPath = `/tmp/${competitor}-manifest.yml`;
            fs.writeFileSync(manifestPath, k8sManifest);

            await $`kubectl apply -f ${manifestPath}`;
            console.log(`[${competitor}] ⏳ Waiting for deployment to be ready...`);

            // Wait for rollout
            await $`kubectl rollout status deployment/${competitor}-deployment --timeout=300s`;
            console.log(`[${competitor}] ✅ Deployment ready.`);

            // Wait a few seconds for load balancer/service routing to settle
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Iterate through every test type requested in bench.config.yml
            for (const testType of config.test.types) {
                let endpoint = '/plaintext';
                if (testType === 'json') {
                    endpoint = '/json';
                } else if (testType === 'database/single-read') {
                    endpoint = '/database/single-read';
                } else if (testType === 'database/multiple-read') {
                    endpoint = '/database/multiple-read';
                } else if (testType === 'database/single-write') {
                    endpoint = '/database/single-write';
                } else if (testType === 'database/multiple-write') {
                    endpoint = '/database/multiple-write';
                }
                const targetUrl = `http://${competitor}-service${endpoint}`;
                const sanitizedTestType = testType.replace(/\//g, "-");

                // --- WARMUP PHASE ---
                const warmupDuration = config.test.warmupDuration || "30s";
                console.log(`\n[${competitor}] 🔥 Warming up for '${testType}' (${warmupDuration})...`);
                try {
                    await $`kubectl run wrk-warmup-${competitor}-${sanitizedTestType} --rm -i \
                        --image=skandyla/wrk \
                        --restart=Never \
                        -- -t ${config.test.threads} -c ${config.test.connections} -d ${warmupDuration} ${targetUrl}`.quiet();
                } catch (e) {
                    console.warn(`[${competitor}] ⚠️ Warmup failed (ignoring):`, e);
                }

                const idleWaitDurationStr = config.test.idleWaitDuration || "15s";
                const idleWaitMs = parseTimeToSeconds(idleWaitDurationStr) * 1000;
                console.log(`[${competitor}] ⏳ Waiting ${idleWaitDurationStr} for resources to settle before test...`);
                await new Promise(resolve => setTimeout(resolve, idleWaitMs));

                // --- ACTUAL TEST PHASE ---
                console.log(`[${competitor}] 🧨 Running load test '${testType}' with 'wrk' for ${config.test.duration}...`);

                const isDbTest = testType.startsWith('database/');

                // Capture Idle metrics before test
                const idleMetrics = await getPodMetrics(competitor);
                const idleConnections = (dbType && isDbTest) ? await getDbConnectionCount(dbType) : undefined;
                console.log(`[${competitor}] 💤 Idle Metrics -> CPU: ${idleMetrics.cpu}m, RAM: ${idleMetrics.memory}Mi${idleConnections !== undefined ? `, Connections: ${idleConnections}` : ''}`);

                // Run wrk and capture output. We run it as a Job or a standalone Pod.
                const wrkCommand = `wrk -t ${config.test.threads} -c ${config.test.connections} -d ${config.test.duration} --latency ${targetUrl}`;
                console.log(`[${competitor}] Executing: ${wrkCommand} from inside cluster...`);

                // Ensure any leftover pod is deleted
                await $`kubectl delete pod wrk-test-${competitor}-${sanitizedTestType} --ignore-not-found`.quiet();

                // Start tracking peak metrics in the background
                let peakCpu = idleMetrics.cpu;
                let peakMemory = idleMetrics.memory;
                let peakConnections = idleConnections;
                let testRunning = true;

                const metricInterval = setInterval(async () => {
                    if (!testRunning) return;
                    const [m, c] = await Promise.all([
                        getPodMetrics(competitor),
                        (dbType && isDbTest) ? getDbConnectionCount(dbType) : Promise.resolve(undefined)
                    ]);
                    if (m.cpu > peakCpu) peakCpu = m.cpu;
                    if (m.memory > peakMemory) peakMemory = m.memory;
                    if (c !== undefined && peakConnections !== undefined && c > peakConnections) peakConnections = c;
                }, 1000);

                const testOutput = await $`kubectl run wrk-test-${competitor}-${sanitizedTestType} --rm -i \
            --image=skandyla/wrk \
            --restart=Never \
            -- -t ${config.test.threads} -c ${config.test.connections} -d ${config.test.duration} --latency ${targetUrl}`.text();

                testRunning = false;
                clearInterval(metricInterval);

                console.log(`[${competitor}] 📊 Load test '${testType}' complete. Parsing results...`);
                let metrics = parseWrkOutput(testOutput);
                metrics = mergePodMetrics(metrics, idleMetrics.cpu, peakCpu, idleMetrics.memory, peakMemory, idleConnections, peakConnections);

                finalReport[competitor][testType] = metrics;
                console.log(`[${competitor}] 📈 Metrics (${testType}):`, metrics);

                // Wait 5 seconds between separate tests for DNS/sockets to flush
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

        } catch (error) {
            console.error(`[${competitor}] ❌ Benchmark failed:`, error);
            finalReport[competitor].error = String(error);
        } finally {
            // 6. Cleanup competitor and database
            console.log(`[${competitor}] 🧹 Cleaning up resources...`);
            try {
                // Cleanup competitor
                await $`kubectl delete deployment ${competitor}-deployment --ignore-not-found`;
                await $`kubectl delete service ${competitor}-service --ignore-not-found`;

                // Cleanup database
                if (dbType === "postgres") {
                    await $`kubectl delete deployment postgres-deployment --ignore-not-found`;
                    await $`kubectl delete service postgres-service --ignore-not-found`;
                    await $`kubectl delete configmap postgres-init-script --ignore-not-found`;
                    await $`rm -f /tmp/postgres-manifest.yml`;
                } else if (dbType === "mssql") {
                    await $`kubectl delete deployment mssql-deployment --ignore-not-found`;
                    await $`kubectl delete service mssql-service --ignore-not-found`;
                    await $`kubectl delete configmap mssql-init-script --ignore-not-found`;
                    await $`rm -f /tmp/mssql-manifest.yml`;
                }
            } catch (e) {
                console.error(`[${competitor}] Cleanup error:`, e);
            }
        }
    }

    // 7. Output Report
    console.log(`\n======================================================`);
    const reportDir = "reports";
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir);
    }
    const reportPath = `${reportDir}/${startTime}.json`;
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
