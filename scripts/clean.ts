/// <reference types="bun-types" />
import { $ } from "bun";

async function main() {
    console.log("🧹 Cleaning up lingering benchmark resources...");

    // 1. Delete all deployments and services
    // We use labels where possible, or specific names
    try {
        // Delete deployments and services for competitors
        await $`kubectl delete deployments,services -l app --ignore-not-found`.quiet();

        // Explicitly delete postgres and mssql resources just in case they lack labels or were named differently
        await $`kubectl delete deployments,services,configmaps postgres-deployment postgres-service postgres-init-script mssql-deployment mssql-service mssql-init-script --ignore-not-found`.quiet();

        // Delete any pods created by kubectl run (k6 pods)
        // We can use a pattern if kubectl delete pod supports it, otherwise we get all and filter
        const podsOutput = await $`kubectl get pods --no-headers -o custom-columns=":metadata.name"`.text();
        const benchmarkPods = podsOutput.split("\n")
            .map(p => p.trim())
            .filter(p => p.startsWith("k6-warmup-") || p.startsWith("k6-test-"));

        if (benchmarkPods.length > 0) {
            console.log(`🗑️ Deleting ${benchmarkPods.length} lingering k6 pods...`);
            await $`kubectl delete pod ${benchmarkPods} --ignore-not-found`.quiet();
        }

        // Delete metrics-server if we want a truly clean state?
        // Usually we want to keep metrics-server if it was set up by the runner.
        // The runner checks if it's there. Let's leave it.
    } catch (e) {
        // console.warn("Cleanup warning:", e);
    }

    // 2. Remove generated manifests in /tmp
    try {
        await $`rm -f /tmp/*.yml`.quiet(); // Slightly broader but likely safe for /tmp in this context
    } catch (e) {
        // ignore
    }

    console.log("✅ Clean complete.");
}

main().catch(console.error);
