/// <reference types="bun-types" />
import { $ } from "bun";

// Parses `kubectl top pod` output into cpu (millicores) and memory (MB)
export async function getPodMetrics(competitor: string): Promise<{ cpu: number, memory: number }> {
    try {
        const topOutput = await $`kubectl top pod -l app=${competitor} --no-headers`.text();
        const lines = topOutput.trim().split("\n");
        if (lines.length > 0 && lines[0]) {
            const parts = lines[0].trim().split(/\s+/);
            if (parts.length >= 3) {
                const cpuStr = parts[1];
                const memStr = parts[2];
                let cpu = 0;
                if (cpuStr.endsWith('m')) cpu = parseInt(cpuStr.substring(0, cpuStr.length - 1));

                let memory = 0;
                if (memStr.endsWith('Mi')) memory = parseInt(memStr.substring(0, memStr.length - 2));
                return { cpu, memory };
            }
        }
    } catch (e) { /* ignore if pod not ready or metrics server lagging */ }
    return { cpu: 0, memory: 0 };
}

export async function getDbConnectionCount(dbType: "postgres" | "mssql"): Promise<number> {
    try {
        const port = dbType === "postgres" ? 5432 : 1433;
        const portHex = port.toString(16).toUpperCase().padStart(4, '0');
        const deployment = `${dbType}-deployment`;

        // Try netstat, then ss, then fallback to raw /proc/net/tcp and /proc/net/tcp6
        const output = await $`kubectl exec deployment/${deployment} -- sh -c "netstat -tan 2>/dev/null || ss -tan 2>/dev/null || cat /proc/net/tcp /proc/net/tcp6 2>/dev/null"`.text();
        const lines = output.trim().split("\n");

        // 1. Try to parse netstat/ss style output first
        const netstatConnections = lines.filter(line =>
            (line.includes(`:${port}`) || line.includes(`.${port}`)) &&
            (line.includes("ESTABLISHED") || line.includes("ESTAB"))
        );
        if (netstatConnections.length > 0) return netstatConnections.length;

        // 2. Fallback to parsing /proc/net/tcp format
        // Header looks like: sl local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode
        // local_address is at index 1, st (state) is at index 3
        const procConnections = lines.filter(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4) return false;
            const localAddr = parts[1];
            const state = parts[3];
            // Match established state (01) and the target port in hex
            return (localAddr.endsWith(`:${portHex}`) && state === "01");
        });

        return procConnections.length;
    } catch (e) {
        // console.warn("Failed to get DB connection count:", e);
    }
    return 0;
}
