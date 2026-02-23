/// <reference types="bun-types" />
import { $ } from "bun";

// Parses `kubectl top pod` output into cpu (millicores) and memory (MiB)
// kubectl top can return:
//   CPU  as "500m" (millicores) or "1" / "2" (whole cores)
//   RAM  as "128Mi" (MiB) or "1Gi" (GiB)
export async function getPodMetrics(label: string): Promise<{ cpu: number, memory: number }> {
    try {
        const topOutput = await $`kubectl top pod -l app=${label} --no-headers`.text();
        const lines = topOutput.trim().split("\n");
        if (lines.length > 0 && lines[0]) {
            const parts = lines[0].trim().split(/\s+/);
            if (parts.length >= 3) {
                const cpuStr = parts[1];
                const memStr = parts[2];

                let cpu = 0;
                if (cpuStr.endsWith('m')) {
                    // e.g. "500m" → 500 millicores
                    cpu = parseInt(cpuStr.substring(0, cpuStr.length - 1));
                } else {
                    // e.g. "1" or "2" → whole cores → convert to millicores
                    const cores = parseFloat(cpuStr);
                    if (!isNaN(cores)) cpu = Math.round(cores * 1000);
                }

                let memory = 0;
                if (memStr.endsWith('Mi')) {
                    memory = parseInt(memStr.substring(0, memStr.length - 2));
                } else if (memStr.endsWith('Gi')) {
                    memory = Math.round(parseFloat(memStr.substring(0, memStr.length - 2)) * 1024);
                } else if (memStr.endsWith('Ki')) {
                    memory = Math.round(parseInt(memStr.substring(0, memStr.length - 2)) / 1024);
                }

                return { cpu, memory };
            }
        }
    } catch (e) { /* ignore if pod not ready or metrics server lagging */ }
    return { cpu: 0, memory: 0 };
}

export async function getDbConnectionCount(deploymentName: string, dbType: "postgres" | "mssql"): Promise<number> {
    try {
        const port = dbType === "postgres" ? 5432 : 1433;
        const portHex = port.toString(16).toUpperCase().padStart(4, '0');

        const output = await $`kubectl exec deployment/${deploymentName} -- sh -c "cat /proc/net/tcp /proc/net/tcp6 2>/dev/null || netstat -tan 2>/dev/null || ss -tan 2>/dev/null"`.text();
        const lines = output.trim().split("\n");

        if (lines.length === 0) return 0;

        // 1. Try parsing /proc/net/tcp format first
        if (lines[0].includes("local_address")) {
            const procConnections = lines.filter(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 4) return false;
                const localAddr = parts[1];
                const remAddr = parts[2];
                const state = parts[3];
                // Match established state (01) and strictly the target port in hex
                // 0100007F is 127.0.0.1 in little-endian hex notation used by /proc/net/tcp
                return localAddr && localAddr.endsWith(`:${portHex}`) && state === "01" && remAddr && !remAddr.startsWith("0100007F:");
            });
            return procConnections.length;
        }

        // 2. Fallback to parsing netstat/ss style output
        const netstatConnections = lines.filter(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 5) return false;

            const isNetstat = parts[0].startsWith("tcp");
            const state = isNetstat ? parts[5] : parts[0];
            const localAddr = isNetstat ? parts[3] : (parts.length > 3 ? parts[3] : "");
            const remAddr = isNetstat ? parts[4] : (parts.length > 4 ? parts[4] : "");

            return localAddr && localAddr.endsWith(`:${port}`) &&
                (state === "ESTABLISHED" || state === "ESTAB") &&
                remAddr && !remAddr.startsWith("127.0.0.1:");
        });

        return netstatConnections.length;
    } catch (e) {
        // console.warn("Failed to get DB connection count:", e);
    }
    return 0;
}
