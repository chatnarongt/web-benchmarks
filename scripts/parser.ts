/// <reference types="bun-types" />
import * as fs from "fs";
import * as yaml from "js-yaml";

export interface PoolConfig {
  maxSize?: number;
  minSize?: number;
  lifetime?: number;
  timeout?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
}

export interface CompetitorConfig {
  name: string;
  database?: "postgres" | "mssql";
  pool?: PoolConfig;
  env?: Record<string, string>;
}

export interface BenchmarkConfig {
  competitors: CompetitorConfig[];
  test: {
    types: string[];
    concurrency: number;
    vus: number;
    duration: string;
    warmupDuration: string;
    idleWaitDuration: string;
    databaseSettleDuration: string;
    logMode?: "verbose" | 'info' | "summary" | "silent";
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

export function parseConfig(configPath: string = "bench.config.yml"): BenchmarkConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  const fileContents = fs.readFileSync(configPath, "utf8");
  return yaml.load(fileContents) as BenchmarkConfig;
}

// Helper to safely convert wrk time format to seconds
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const value = parseFloat(timeStr);
  if (timeStr.includes("ms")) return value / 1000;
  if (timeStr.includes("us")) return value / 1000000;
  if (timeStr.includes("m") && !timeStr.includes("ms")) return value * 60;
  return value; // already in seconds
}

export function parseCpuToM(cpuStr: string | number): number {
  if (typeof cpuStr === 'number') return cpuStr;
  if (!cpuStr) return 0;
  const value = parseFloat(cpuStr);
  if (cpuStr.toLowerCase().endsWith('m')) return value;
  return value * 1000;
}

export function parseMemToMi(memStr: string | number): number {
  if (typeof memStr === 'number') return memStr;
  if (!memStr) return 0;
  const value = parseFloat(memStr);
  const lower = memStr.toLowerCase();
  if (lower.endsWith('gi')) return value * 1024;
  if (lower.endsWith('mi')) return value;
  if (lower.endsWith('ki')) return value / 1024;
  if (lower.endsWith('g')) return value * 1024; // simplified
  if (lower.endsWith('m')) return value;
  return value; // assume Mi
}

export function parseK6Output(output: string) {
  const metrics: any = {
    totalRequests: 0,
    requestsPerSecond: 0,
    latencyAverageMs: 0,
    latencyMaxMs: 0,
    errorCount: 0,
    errorPercent: 0,
  };

  try {
    const startMarker = "K6_JSON_SUMMARY_START";
    const endMarker = "K6_JSON_SUMMARY_END";
    const startIdx = output.indexOf(startMarker);
    const endIdx = output.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = output.substring(startIdx + startMarker.length, endIdx).trim();
      const data = JSON.parse(jsonStr);

      metrics.totalRequests = data.metrics?.http_reqs?.values?.count || 0;
      metrics.requestsPerSecond = Number((data.metrics?.http_reqs?.values?.rate || 0).toFixed(2));
      metrics.latencyAverageMs = Number((data.metrics?.http_req_duration?.values?.avg || 0).toFixed(4));
      metrics.latencyMaxMs = Number((data.metrics?.http_req_duration?.values?.max || 0).toFixed(4));

      const totalReqs = metrics.totalRequests;
      const failedReqs = data.metrics?.http_req_failed?.values?.passes || 0;
      metrics.errorCount = failedReqs;

      if (totalReqs > 0) {
        metrics.errorPercent = Number(((failedReqs / totalReqs) * 100).toFixed(2));
      }
    } else {
      console.warn("K6 JSON summary markers not found in output:", output.substring(0, 200) + "...");
    }
  } catch (e) {
    console.error("Error parsing k6 output", e);
  }

  return metrics;
}

export interface ErrorSample {
  count: number;
  status: number;
  response: any;
}

export function parseK6Errors(output: string): ErrorSample[] {
  const prefix = 'K6_ERROR_SAMPLE:';
  const counts = new Map<string, { status: number; body: string; count: number }>();

  for (const line of output.split('\n')) {
    const idx = line.indexOf(prefix);
    if (idx === -1) continue;
    try {
      const raw = JSON.parse(line.substring(idx + prefix.length).trim());
      const key = `${raw.status}:${raw.body}`;
      const entry = counts.get(key);
      if (entry) {
        entry.count++;
      } else {
        counts.set(key, { status: raw.status, body: raw.body, count: 1 });
      }
    } catch { /* malformed line — skip */ }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ count, status, body }) => {
      let response: any = body;
      try { response = JSON.parse(body); } catch { /* keep as string */ }
      return { count, status, response };
    });
}

export function mergePodMetrics(
  parsedMetrics: any,
  idleCpu: number, peakCpu: number,
  idleMemory: number, peakMemory: number,
  idleConnections?: number, peakConnections?: number,
  dbIdleCpu?: number, dbPeakCpu?: number,
  dbIdleMemory?: number, dbPeakMemory?: number,
  appLimits?: { cpu: string | number; memory: string | number },
  dbLimits?: { cpu: string | number; memory: string | number }
) {
  const result: any = {
    ...parsedMetrics,
    cpuUsageIdle: idleCpu,
    cpuUsagePeak: peakCpu,
    memUsageIdle: idleMemory,
    memUsagePeak: peakMemory
  };

  if (appLimits) {
    const limitCpu = parseCpuToM(appLimits.cpu);
    const limitMem = parseMemToMi(appLimits.memory);
    if (limitCpu > 0) {
      result.cpuUsageIdlePercent = Number(((idleCpu / limitCpu) * 100).toFixed(2));
      result.cpuUsagePeakPercent = Number(((peakCpu / limitCpu) * 100).toFixed(2));
    }
    if (limitMem > 0) {
      result.memUsageIdlePercent = Number(((idleMemory / limitMem) * 100).toFixed(2));
      result.memUsagePeakPercent = Number(((peakMemory / limitMem) * 100).toFixed(2));
    }
  }

  if (idleConnections !== undefined) {
    result.dbConnectionCountIdle = idleConnections;
  }
  if (peakConnections !== undefined) {
    result.dbConnectionCountPeak = peakConnections;
  }

  if (dbIdleCpu !== undefined) result.dbCpuUsageIdle = dbIdleCpu;
  if (dbPeakCpu !== undefined) result.dbCpuUsagePeak = dbPeakCpu;
  if (dbIdleMemory !== undefined) result.dbMemUsageIdle = dbIdleMemory;
  if (dbPeakMemory !== undefined) result.dbMemUsagePeak = dbPeakMemory;

  if (dbLimits && dbIdleCpu !== undefined) {
    const limitCpu = parseCpuToM(dbLimits.cpu);
    const limitMem = parseMemToMi(dbLimits.memory);
    if (limitCpu > 0) {
      result.dbCpuUsageIdlePercent = Number(((dbIdleCpu / limitCpu) * 100).toFixed(2));
      result.dbCpuUsagePeakPercent = Number(((dbPeakCpu! / limitCpu) * 100).toFixed(2));
    }
    if (limitMem > 0) {
      result.dbMemUsageIdlePercent = Number(((dbIdleMemory! / limitMem) * 100).toFixed(2));
      result.dbMemUsagePeakPercent = Number(((dbPeakMemory! / limitMem) * 100).toFixed(2));
    }
  }

  return result;
}
