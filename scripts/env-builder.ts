import { type CompetitorConfig, type PoolConfig } from "./parser.ts";

/**
 * Appends MSSQL connection pool parameters to a connection string.
 * Strips any trailing semicolon before appending so entries are never duplicated.
 */
function applyMssqlPool(cs: string, p: PoolConfig): string {
    let s = cs.trimEnd().replace(/;$/, '');
    if (p.maxSize !== undefined) s += `;Max Pool Size=${p.maxSize}`;
    if (p.minSize !== undefined) s += `;Min Pool Size=${p.minSize}`;
    if (p.lifetime !== undefined) s += `;Connection Lifetime=${p.lifetime}`;
    if (p.timeout !== undefined) s += `;Connection Timeout=${p.timeout}`;
    if (p.encrypt !== undefined) s += `;Encrypt=${p.encrypt ? 'True' : 'False'}`;
    if (p.trustServerCertificate !== undefined) s += `;TrustServerCertificate=${p.trustServerCertificate ? 'True' : 'False'}`;
    return s + ';';
}

/**
 * Builds the final env map that will be injected into the competitor's Kubernetes pod.
 *
 * Steps performed:
 *  1. Copy the competitor's env vars.
 *  2. Replace `postgres-service` / `mssql-service` placeholders with the actual
 *     dynamically-named service (e.g. `mssql-service-dotnet-mvc-mssql-ef`).
 *  3. Ensure both `DATABASE_URL` and `ConnectionStrings__BenchmarkDatabase` are present,
 *     deriving one from the other when only one is supplied, or falling back to a
 *     built-in default when neither is defined.
 *  4. Apply `pool` config parameters to MSSQL connection strings.
 */
export function buildEnv(
    competitorConfig: CompetitorConfig,
    dbServiceName: string,
): Record<string, string> {
    const env = { ...(competitorConfig.env || {}) };
    const dbType = competitorConfig.database;
    const pool = competitorConfig.pool;

    // Step 2 — replace service-name placeholders
    for (const key of Object.keys(env)) {
        const val = String(env[key]);
        if (dbType === "postgres" && val.includes("postgres-service")) {
            env[key] = val.replace("postgres-service", dbServiceName);
        } else if (dbType === "mssql" && val.includes("mssql-service")) {
            env[key] = val.replace("mssql-service", dbServiceName);
        }
    }

    // Step 3 & 4 — populate / derive / apply pool params
    if (dbType === "postgres") {
        if (!env["DATABASE_URL"]) {
            env["DATABASE_URL"] = `postgres://postgres:benchmark@${dbServiceName}:5432/benchmark?sslmode=disable`;
        }
        // Postgres competitors use DATABASE_URL; ConnectionStrings__ is not needed.
    } else if (dbType === "mssql") {
        const hasUrl = !!env["DATABASE_URL"];
        const hasCs = !!env["ConnectionStrings__BenchmarkDatabase"];

        if (!hasUrl && !hasCs) {
            // Neither provided — build default, then apply pool params
            let cs = `Server=${dbServiceName},1433;Database=benchmark;User Id=sa;Password=Benchmark123!;`;
            cs = pool
                ? applyMssqlPool(cs, pool)
                : cs + `Encrypt=False;TrustServerCertificate=True;Connection Timeout=30;Min Pool Size=1;Max Pool Size=100;`;
            env["DATABASE_URL"] = cs;
            env["ConnectionStrings__BenchmarkDatabase"] = cs;
        } else if (hasCs && !hasUrl) {
            // Dotnet-style — apply pool then derive DATABASE_URL
            if (pool) env["ConnectionStrings__BenchmarkDatabase"] = applyMssqlPool(env["ConnectionStrings__BenchmarkDatabase"], pool);
            env["DATABASE_URL"] = env["ConnectionStrings__BenchmarkDatabase"];
        } else if (hasUrl && !hasCs) {
            // Generic style — apply pool then derive ConnectionStrings__
            if (pool) env["DATABASE_URL"] = applyMssqlPool(env["DATABASE_URL"], pool);
            env["ConnectionStrings__BenchmarkDatabase"] = env["DATABASE_URL"];
        } else {
            // Both present — apply pool to each independently
            if (pool) {
                env["DATABASE_URL"] = applyMssqlPool(env["DATABASE_URL"], pool);
                env["ConnectionStrings__BenchmarkDatabase"] = applyMssqlPool(env["ConnectionStrings__BenchmarkDatabase"], pool);
            }
        }
    }

    return env;
}
