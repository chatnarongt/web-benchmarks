// Helper to safely convert wrk time format to seconds
function parseTimeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const value = parseFloat(timeStr);
    if (timeStr.includes("ms")) return value / 1000;
    if (timeStr.includes("us")) return value / 1000000;
    if (timeStr.includes("m") && !timeStr.includes("ms")) return value * 60;
    return value; // already in seconds
}

export function parseWrkOutput(output: string) {
    const metrics: any = {
        totalRequests: 0,
        requestsPerSecond: 0,
        avgResponseTimeSecs: 0,
        maxResponseTimeSecs: 0,
        errorRatePercent: 0,
    };

    try {
        // 1. Total Requests
        // Ex: "  504 requests in 5.03s, 502.67KB read"
        const reqMatch = output.match(/\s+(\d+)\s+requests in/);
        if (reqMatch) metrics.totalRequests = parseInt(reqMatch[1]);

        // 2. Requests per Second
        // Ex: "Requests/sec:    100.13"
        const rpsMatch = output.match(/Requests\/sec:\s+(\d+\.\d+)/);
        if (rpsMatch) metrics.requestsPerSecond = parseFloat(rpsMatch[1]);

        // 3. Latency Details (Avg, Max)
        // Ex: "    Latency   428.77ms  167.73ms   1.34s    87.90%"
        const latencyMatch = output.match(/Latency\s+([\d\.]+[a-zA-Z]+)\s+[\d\.]+[a-zA-Z]+\s+([\d\.]+[a-zA-Z]+)/);
        if (latencyMatch) {
            metrics.avgResponseTimeSecs = parseTimeToSeconds(latencyMatch[1]);
            metrics.maxResponseTimeSecs = parseTimeToSeconds(latencyMatch[2]);
        }

        // 4. Latency Distribution
        // wrk doesn't explicitly expose the absolute "Min" or "Fastest".

        // 5. Error Rate
        let errors = 0;
        const non2xxMatch = output.match(/Non-2xx or 3xx responses:\s+(\d+)/);
        if (non2xxMatch) errors += parseInt(non2xxMatch[1]);

        const socketErrorsMatch = output.match(/Socket errors:\s+connect\s+(\d+),\s+read\s+(\d+),\s+write\s+(\d+),\s+timeout\s+(\d+)/);
        if (socketErrorsMatch) {
            errors += parseInt(socketErrorsMatch[1]) + parseInt(socketErrorsMatch[2]) + parseInt(socketErrorsMatch[3]) + parseInt(socketErrorsMatch[4]);
        }

        if (metrics.totalRequests > 0) {
            metrics.errorRatePercent = Number(((errors / metrics.totalRequests) * 100).toFixed(2));
        }

    } catch (e) {
        console.error("Error parsing wrk output", e);
    }

    return metrics;
}
