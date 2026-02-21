/// <reference types="bun-types" />
import * as fs from "fs";
import * as yaml from "js-yaml";
import { $ } from "bun";
import { generateK8sManifest } from "./manifests.ts";
import { parseWrkOutput } from "./parser.ts";

interface BenchmarkConfig {
    competitors: string[];
    test: {
        types: string[];
        concurrency: number;
        connections: number;
        duration: string;
        threads: number;
    };
    resources: {
        replicas: number;
        requests: { cpu: string; memory: string };
        limits: { cpu: string; memory: string };
    };
}

async function main() {
    const startTime = new Date().toISOString();
    console.log(`🚀 Starting Benchmark Orchestration Pipeline at ${startTime}`);

    // 1. Parse configuration
    const fileContents = fs.readFileSync("bench.config.yml", "utf8");
    const config = yaml.load(fileContents) as BenchmarkConfig;

    console.log(`Loaded config for ${config.competitors.length} competitors. Test duration: ${config.test.duration}/type.`);

    const finalReport: Record<string, any> = {};

    // For now we assume sequential execution (concurrency = 1)
    for (const competitor of config.competitors) {
        console.log(`\n======================================================`);
        console.log(`[${competitor}] 🏁 Starting Benchmark`);
        console.log(`======================================================`);

        finalReport[competitor] = {};

        try {
            // 2. Build Docker Image
            console.log(`[${competitor}] 🐳 Building Docker image...`);
            await $`docker build -t ${competitor}:benchmark ./competitors/${competitor}`;
            console.log(`[${competitor}] ✅ Docker image built successfully.`);

            // 3 & 4. Generate and Apply Kubernetes Manifests
            console.log(`\n[${competitor}] ☸️  Deploying to Kubernetes...`);
            const k8sManifest = generateK8sManifest(competitor, config.resources);
            const manifestPath = `/tmp/${competitor}-manifest.yml`;
            fs.writeFileSync(manifestPath, k8sManifest);

            await $`kubectl apply -f ${manifestPath}`;
            console.log(`[${competitor}] ⏳ Waiting for deployment to be ready...`);

            // Wait for rollout
            await $`kubectl rollout status deployment/${competitor}-deployment --timeout=120s`;
            console.log(`[${competitor}] ✅ Deployment ready.`);

            // Wait a few seconds for load balancer/service routing to settle
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Iterate through every test type requested in bench.config.yml
            for (const testType of config.test.types) {
                console.log(`\n[${competitor}] 🧨 Running load test '${testType}' with 'wrk' for ${config.test.duration}...`);

                const endpoint = testType === 'json' ? '/json' : '/plaintext';
                const targetUrl = `http://${competitor}-service${endpoint}`;

                // Run wrk and capture output. We run it as a Job or a standalone Pod.
                const wrkCommand = `wrk -t ${config.test.threads} -c ${config.test.connections} -d ${config.test.duration} --latency ${targetUrl}`;
                console.log(`[${competitor}] Executing: ${wrkCommand} from inside cluster...`);

                // Ensure any leftover pod is deleted
                await $`kubectl delete pod wrk-test-${competitor}-${testType} --ignore-not-found`.quiet();

                const testOutput = await $`kubectl run wrk-test-${competitor}-${testType} --rm -i \
            --image=skandyla/wrk \
            --restart=Never \
            -- -t ${config.test.threads} -c ${config.test.connections} -d ${config.test.duration} --latency ${targetUrl}`.text();

                console.log(`[${competitor}] 📊 Load test '${testType}' complete. Parsing results...`);
                const metrics = parseWrkOutput(testOutput);
                finalReport[competitor][testType] = metrics;
                console.log(`[${competitor}] 📈 Metrics (${testType}):`, metrics);

                // Wait 5 seconds between separate tests for DNS/sockets to flush
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

        } catch (error) {
            console.error(`[${competitor}] ❌ Benchmark failed:`, error);
            finalReport[competitor] = { error: String(error) };
        } finally {
            // 6. Cleanup
            console.log(`[${competitor}] 🧹 Cleaning up deployment...`);
            try {
                await $`kubectl delete deployment ${competitor}-deployment --ignore-not-found`;
                await $`kubectl delete service ${competitor}-service --ignore-not-found`;
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
    const exportReport = {
        configs: config,
        result: finalReport
    };
    fs.writeFileSync(reportPath, JSON.stringify(exportReport, null, 2));
    console.log(exportReport);
}

main().catch(console.error);
