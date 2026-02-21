/// <reference types="bun-types" />
import * as fs from "fs";
import * as yaml from "js-yaml";
import { $ } from "bun";

interface BenchmarkConfig {
    competitors: string[];
}

async function main() {
    console.log("🧹 Cleaning up lingering resources...");

    // 1. Delete all deployments and services
    try {
        await $`kubectl delete deployment --all`.quiet();
        await $`kubectl delete service --all`.quiet();
    } catch (e) {
        // ignore errors if nothing to delete
    }

    // 2. Parse configuration to get competitor names for 'hey' pods
    try {
        const fileContents = fs.readFileSync("bench.config.yml", "utf8");
        const config = yaml.load(fileContents) as BenchmarkConfig;

        // Delete wrk-test pods for each competitor
        for (const competitor of config.competitors) {
            try {
                await $`kubectl delete pods -l run=wrk-test-${competitor}-plaintext --ignore-not-found`.quiet();
                await $`kubectl delete pods -l run=wrk-test-${competitor}-json --ignore-not-found`.quiet();
            } catch (e) {
                // ignore
            }
        }
    } catch (e) {
        console.log("Could not find or parse bench.config.yml, skipping wrk pod cleanup.");
    }

    // 3. Remove generated manifests
    try {
        await $`rm -f /tmp/*-manifest.yml`.quiet();
    } catch (e) {
        // ignore
    }

    console.log("✅ Clean complete.");
}

main().catch(console.error);
