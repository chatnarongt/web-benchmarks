/// <reference types="bun-types" />
import { $ } from "bun";
import { parseConfig, type BenchmarkConfig } from "./parser.ts";

async function main() {
    console.log("- Cleaning up benchmark resources based on configuration...");

    let config: BenchmarkConfig;
    try {
        config = parseConfig("bench.config.yml");
    } catch (e: any) {
        console.error(`- Error: ${e.message}`);
        return;
    }

    const existingDeploymentsStr = await $`kubectl get deployments -o custom-columns=":metadata.name" --no-headers`.text().catch(() => "");
    const existingServicesStr = await $`kubectl get services -o custom-columns=":metadata.name" --no-headers`.text().catch(() => "");
    const existingConfigmapsStr = await $`kubectl get configmaps -o custom-columns=":metadata.name" --no-headers`.text().catch(() => "");

    const existingDeployments = new Set(existingDeploymentsStr.split("\n").map(s => s.trim()).filter(Boolean));
    const existingServices = new Set(existingServicesStr.split("\n").map(s => s.trim()).filter(Boolean));
    const existingConfigmaps = new Set(existingConfigmapsStr.split("\n").map(s => s.trim()).filter(Boolean));

    const toDeleteResources: string[] = [];
    const podsToDelete: string[] = [];

    for (const competitorConfig of config.competitors) {
        const competitor = competitorConfig.name;
        const dbType = competitorConfig.database;
        const suffix = competitor.replace(/[^a-z0-9]/gi, '-').toLowerCase();

        // Target competitor services and deployments
        if (existingDeployments.has(`${competitor}-deployment`)) toDeleteResources.push(`deployment/${competitor}-deployment`);
        if (existingServices.has(`${competitor}-service`)) toDeleteResources.push(`service/${competitor}-service`);

        // Target databases if applicable
        if (dbType) {
            const dbDep = `${dbType}-deployment-${suffix}`;
            const dbSvc = `${dbType}-service-${suffix}`;
            const dbCm = `${dbType}-init-script-${suffix}`;

            if (existingDeployments.has(dbDep)) toDeleteResources.push(`deployment/${dbDep}`);
            if (existingServices.has(dbSvc)) toDeleteResources.push(`service/${dbSvc}`);
            if (existingConfigmaps.has(dbCm)) toDeleteResources.push(`configmap/${dbCm}`);
        }
    }

    try {
        if (toDeleteResources.length > 0) {
            console.log(`- Deleting ${toDeleteResources.length} existing competitors resources...`);
            await $`kubectl delete ${toDeleteResources} --ignore-not-found`.quiet();
        } else {
            console.log(`- No competitor resources found to delete.`);
        }

        // Delete k6 pods for these competitors
        const podsOutput = await $`kubectl get pods --no-headers -o custom-columns=":metadata.name"`.text();
        const allPods = podsOutput.split("\n").map(p => p.trim()).filter(Boolean);

        for (const competitorConfig of config.competitors) {
            const competitor = competitorConfig.name;
            const competitorPods = allPods.filter(p =>
                p.startsWith(`k6-warmup-${competitor}-`) ||
                p.startsWith(`k6-test-${competitor}-`)
            );
            podsToDelete.push(...competitorPods);
        }

        if (podsToDelete.length > 0) {
            console.log(`- Deleting ${podsToDelete.length} lingering k6 pods...`);
            await $`kubectl delete pod ${podsToDelete} --ignore-not-found`.quiet();
        }
    } catch (e) {
        console.error("Cleanup error:", e);
    }

    // 3. Remove generated manifests in /tmp
    try {
        await $`rm -f /tmp/*.yml`.quiet();
    } catch (e) {
        // ignore
    }

    console.log("✅ Clean complete.");
}

main().catch(console.error);
