<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    Card,
    Select,
    Button,
    Fileupload,
    Spinner,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Label,
    Dropdown,
    Toggle,
    MultiSelect,
    Tooltip,
  } from "flowbite-svelte";
  import BarChart from "./lib/BarChart.svelte";

  // Dynamic import of all reports using Vite's glob import
  // Setting import to 'default' means we get a promise that resolves
  // to the default export (which is the JSON content itself)
  const reportModules = import.meta.glob("../reports/*.json", {
    import: "default",
  });

  let availableReports: string[] = $state([]);
  let selectedReportName: string | null = $state(null);
  let reportData: any = $state(null);
  let loading: boolean = $state(true);

  // Derived state for charts and tables
  let allCompetitors = $derived(
    reportData
      ? Object.keys(reportData.result)
          .filter((c) => !reportData.result[c].error)
          .sort()
      : [],
  );
  let selectedCompetitors = $state<string[]>([]);
  let competitors = $derived(
    allCompetitors.filter((c) => selectedCompetitors.includes(c)),
  );

  let allTestTypes = $derived(reportData?.configs?.test?.types || []);
  let selectedTestTypes = $state<string[]>([]);
  let testTypes = $derived(
    allTestTypes.filter((t: string) => selectedTestTypes.includes(t)),
  );

  const chartColors = [
    "rgba(56, 189, 248, 0.85)", // accent-primary (sky-400)
  ];

  const getCompColor = (comp: string) => {
    const idx = allCompetitors.indexOf(comp);
    return chartColors[idx % chartColors.length];
  };

  const testTypeLabel: Record<string, string> = {
    // Non-DB
    plaintext: "Plaintext",
    "json-serialization": "JSON Serialization",
    // Read
    "read-one": "Read One",
    "read-many": "Read Many",
    // Create
    "create-one": "Create One",
    "create-many": "Create Many",
    // Update
    "update-one": "Update One",
    "update-many": "Update Many",
    // Legacy keys (for old reports)
    json: "JSON",
    "single-read": "Single Read",
    "multiple-read": "Multiple Read",
    "single-create": "Single Create",
    "multiple-create": "Multiple Create",
    "single-update": "Single Update",
    "multiple-update": "Multiple Update",
    "database/single-read": "Single Read",
    "database/multiple-read": "Multiple Read",
    "database/single-write": "Single Write",
    "database/multiple-write": "Multiple Write",
  };

  function getReportLabel(filename: string) {
    try {
      if (filename.endsWith(".json")) {
        const base = filename.replace(".json", "");
        const [dPart, tPart] = base.split("T");
        if (tPart) {
          const iso = `${dPart}T${tPart.replace(/-/g, ":")}`;
          const d = new Date(iso);
          if (!isNaN(d.getTime())) return d.toLocaleString("th");
        }
      }
    } catch (e) {}
    return filename;
  }

  function resetCompetitors() {
    selectedCompetitors = allCompetitors.slice(0, 10);
  }

  function clearCompetitors() {
    selectedCompetitors = [];
  }

  function resetTestTypes() {
    selectedTestTypes = [...allTestTypes];
  }

  function clearTestTypes() {
    selectedTestTypes = [];
  }

  $effect(() => {
    if (selectedCompetitors.length > 20) {
      selectedCompetitors = selectedCompetitors.slice(0, 20);
    }
  });

  const metricsList = [
    { id: "requests", key: "totalRequests", label: "Requests" },
    { id: "reqPerSec", key: "requestsPerSecond", label: "Req/Sec" },
    {
      id: "avgLatency",
      key: "latencyAverageMs",
      label: "Avg Latency",
      format: (v: number) => v.toFixed(1) + "ms",
    },
    {
      id: "maxLatency",
      key: "latencyMaxMs",
      label: "Max Latency",
      format: (v: number) => v.toFixed(1) + "ms",
    },
    {
      id: "errors",
      key: "errorCount",
      label: "Errors",
      isResource: true,
      pct: (r: any) => `${(r.errorPercent || 0).toFixed(1)}%`,
      val: (r: any) => `${r.errorCount || 0}`,
    },
    {
      id: "appCpu",
      key: "cpuUsagePeakPercent",
      label: "App CPU (Idl/Max)",
      isComboResource: true,
      idleKey: "cpuUsageIdlePercent",
      peakKey: "cpuUsagePeakPercent",
      idlePctOut: (r: any) =>
        `${Math.min(r.cpuUsageIdlePercent || 0, 100).toFixed(1)}`,
      peakPctOut: (r: any) =>
        `${Math.min(r.cpuUsagePeakPercent || 0, 100).toFixed(1)}%`,
      idleValOut: (r: any) => `${r.cpuUsageIdle || 0}`,
      peakValOut: (r: any) => `${r.cpuUsagePeak || 0}m`,
    },
    {
      id: "appRam",
      key: "memUsagePeakPercent",
      label: "App RAM (Idl/Max)",
      isComboResource: true,
      idleKey: "memUsageIdlePercent",
      peakKey: "memUsagePeakPercent",
      idlePctOut: (r: any) =>
        `${Math.min(r.memUsageIdlePercent || 0, 100).toFixed(1)}`,
      peakPctOut: (r: any) =>
        `${Math.min(r.memUsagePeakPercent || 0, 100).toFixed(1)}%`,
      idleValOut: (r: any) => `${r.memUsageIdle || 0}`,
      peakValOut: (r: any) => `${r.memUsagePeak || 0}MB`,
    },
    {
      id: "dbCpu",
      key: "dbCpuUsagePeakPercent",
      label: "DB CPU (Idl/Max)",
      isComboResource: true,
      idleKey: "dbCpuUsageIdlePercent",
      peakKey: "dbCpuUsagePeakPercent",
      idlePctOut: (r: any) =>
        `${Math.min(r.dbCpuUsageIdlePercent || 0, 100).toFixed(1)}`,
      peakPctOut: (r: any) =>
        `${Math.min(r.dbCpuUsagePeakPercent || 0, 100).toFixed(1)}%`,
      idleValOut: (r: any) => `${r.dbCpuUsageIdle || 0}`,
      peakValOut: (r: any) => `${r.dbCpuUsagePeak || 0}m`,
    },
    {
      id: "dbRam",
      key: "dbMemUsagePeakPercent",
      label: "DB RAM (Idl/Max)",
      isComboResource: true,
      idleKey: "dbMemUsageIdlePercent",
      peakKey: "dbMemUsagePeakPercent",
      idlePctOut: (r: any) =>
        `${Math.min(r.dbMemUsageIdlePercent || 0, 100).toFixed(1)}`,
      peakPctOut: (r: any) =>
        `${Math.min(r.dbMemUsagePeakPercent || 0, 100).toFixed(1)}%`,
      idleValOut: (r: any) => `${r.dbMemUsageIdle || 0}`,
      peakValOut: (r: any) => `${r.dbMemUsagePeak || 0}MB`,
    },
    {
      id: "dbConns",
      key: "dbConnectionCountPeak",
      label: "DB Conns (Idl/Max)",
      format: (v: number, r: any) =>
        `${r.dbConnectionCountIdle || 0} / ${v || 0}`,
    },
  ];

  function initCols(types: string[]) {
    for (const t of types) {
      if (!selectedColumnsByTest[t]) {
        let cols = ["reqPerSec", "avgLatency", "errors", "appCpu", "appRam"];
        if (typeof localStorage !== "undefined") {
          const saved = localStorage.getItem(`cols_${t}`);
          if (saved) {
            try {
              cols = JSON.parse(saved);
            } catch (e) {}
          } else {
            const oldSaved = localStorage.getItem("selectedColumns");
            if (oldSaved) {
              try {
                const parsed = JSON.parse(oldSaved);
                cols = parsed.flatMap((c: string) => {
                  if (c === "appResources") return ["appCpu", "appRam"];
                  if (c === "dbResources") return ["dbCpu", "dbRam"];
                  return c;
                });
              } catch (e) {}
            }
          }
        }
        selectedColumnsByTest[t] = cols;
      }
    }
  }

  function saveCols(t: string) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        `cols_${t}`,
        JSON.stringify(selectedColumnsByTest[t]),
      );
    }
  }

  function handleToggleColumn(
    testType: string,
    metricId: string,
    checked: boolean,
  ) {
    let cols = selectedColumnsByTest[testType] || [];
    if (checked) {
      if (!cols.includes(metricId)) {
        selectedColumnsByTest[testType] = [...cols, metricId];
      }
    } else {
      selectedColumnsByTest[testType] = cols.filter((id) => id !== metricId);
    }
    saveCols(testType);
  }

  let selectedColumnsByTest: Record<string, string[]> = $state({});

  onMount(async () => {
    // Extract filename from the path
    availableReports = Object.keys(reportModules).map((path) => {
      const parts = path.split("/");
      return parts[parts.length - 1];
    });

    // Sort descending (newest first)
    availableReports.sort((a, b) => b.localeCompare(a));

    if (availableReports.length > 0) {
      selectedReportName = availableReports[0];
      await loadReport(selectedReportName);
    } else {
      loading = false;
    }
  });

  async function loadReport(filename: string) {
    loading = true;
    reportData = null;
    await tick(); // Wait for DOM to clear old charts

    const path = `../reports/${filename}`;
    if (reportModules[path]) {
      try {
        const data = await reportModules[path]();
        reportData = data;
        initCols(reportData?.configs?.test?.types || []);
        selectedCompetitors = Object.keys(reportData.result)
          .filter((c) => !reportData.result[c].error)
          .sort()
          .slice(0, 10);
        selectedTestTypes = [...(reportData?.configs?.test?.types || [])];
      } catch (err) {
        console.error("Failed to load report data", err);
      }
    }
    loading = false;
  }

  async function handleSelectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedReportName = target.value;
    if (selectedReportName) {
      await loadReport(selectedReportName);
    }
  }

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    loading = true;
    reportData = null;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        reportData = json;
        initCols(reportData?.configs?.test?.types || []);
        selectedCompetitors = Object.keys(reportData.result)
          .filter((c) => !reportData.result[c].error)
          .sort()
          .slice(0, 10);
        selectedTestTypes = [...(reportData?.configs?.test?.types || [])];
        selectedReportName = file.name;

        // Add to available updates if not present (just visually)
        if (!availableReports.includes(file.name)) {
          availableReports = [file.name, ...availableReports];
        }
      } catch (err) {
        console.error("Invalid JSON file", err);
        alert("Invalid JSON file");
      } finally {
        loading = false;
      }
    };
    reader.readAsText(file);
  }
  let sortKey: string = $state("requestsPerSecond");
  let sortOrder: "asc" | "desc" = $state("desc");

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortOrder = "desc";
    }
  }

  function getSortedCompetitors(testType: string) {
    if (!reportData) return [];

    return [...competitors].sort((a, b) => {
      let valA: any, valB: any;

      if (sortKey === "name") {
        valA = a;
        valB = b;
      } else {
        valA = reportData.result[a][testType]?.[sortKey];
        valB = reportData.result[b][testType]?.[sortKey];
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let modifier = sortOrder === "asc" ? 1 : -1;
      if (typeof valA === "string") {
        return valA.localeCompare(valB) * modifier;
      }
      return (valA - valB) * modifier;
    });
  }

  function getPctClass(val: number | undefined) {
    const p = val || 0;
    if (p >= 90) return "text-rose-500 dark:text-rose-400 font-bold";
    if (p >= 70) return "text-orange-500 dark:text-orange-400 font-semibold";
    if (p >= 50) return "text-amber-500 dark:text-amber-400 font-medium";
    if (p >= 30) return "text-lime-500 dark:text-lime-400";
    return "text-emerald-500 dark:text-emerald-400";
  }

  function formatMemory(val: any) {
    if (!val) return "N/A";
    return String(val).replace(/Mi/g, "MB").replace(/Gi/g, "GB");
  }

  let testDurationFormatted = $derived.by(() => {
    if (!reportData?.startTime || !reportData?.endTime) return "";
    const diffMs =
      new Date(reportData.endTime).getTime() -
      new Date(reportData.startTime).getTime();
    if (diffMs <= 0) return "";
    const diffMins = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) {
      if (mins === 0) return `(${hours} hour${hours > 1 ? "s" : ""})`;
      return `(${hours} hour${hours > 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""})`;
    }
    return `(${mins} min${mins !== 1 ? "s" : ""})`;
  });
</script>

<main
  class="container mx-auto p-3 md:p-4 space-y-4 text-primary-900 dark:text-gray-100 min-h-screen"
>
  <Card
    size="xl"
    class="w-full max-w-none flex flex-col md:flex-row justify-between items-center gap-3 glass-panel p-3 px-5 rounded-2xl border-0"
  >
    <div class="flex-1">
      <h1
        class="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent"
      >
        Web Benchmarks Viewer
      </h1>
    </div>
    <div class="flex flex-col sm:flex-row items-center gap-4">
      <div class="flex items-center gap-2">
        <Label
          for="report-select"
          class="whitespace-nowrap text-gray-600 dark:text-gray-300"
          >Select Local Report:</Label
        >
        <Select
          id="report-select"
          items={availableReports.map((r) => ({
            value: r,
            name: getReportLabel(r),
          }))}
          bind:value={selectedReportName}
          onchange={handleSelectChange}
          placeholder="-- Select Report --"
          size="sm"
          class="w-48"
        />
      </div>

      <div class="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

      <div class="flex items-center">
        <Button
          size="sm"
          color="alternative"
          class="flex-none bg-primary-900/20 border-primary-800 hover:bg-primary-900/40 text-primary-400 font-medium transition-all"
          onclick={() => document.getElementById("file-upload")?.click()}
        >
          Upload External
        </Button>
        <Fileupload
          id="file-upload"
          accept=".json"
          onchange={handleFileUpload}
          class="hidden"
        />
      </div>
    </div>
  </Card>

  {#if loading}
    <div
      class="flex flex-col items-center justify-center p-16 gap-4 glass-panel rounded-2xl border-0"
    >
      <Spinner size="8" />
      <p class="text-gray-500 dark:text-gray-400">Loading report data...</p>
    </div>
  {:else if reportData}
    <div class="space-y-4">
      <Card
        size="xl"
        class="w-full max-w-none glass-panel rounded-2xl border-0 p-4 relative z-20"
      >
        <div
          class="flex flex-col lg:flex-row justify-between lg:items-center gap-3"
        >
          <div>
            <h2
              class="text-sm font-semibold mb-0.5 text-gray-900 dark:text-white"
            >
              Benchmark Configuration
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {new Date(reportData.startTime).toLocaleString("th")} &mdash; {new Date(
                reportData.endTime,
              ).toLocaleTimeString("th")}
              {testDurationFormatted}
            </p>
          </div>
          <div class="flex flex-wrap gap-4">
            <div class="flex flex-col gap-0.5">
              <span
                class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >Duration</span
              >
              <span
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >{reportData.configs?.test?.duration || "N/A"}</span
              >
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >Virtual Users</span
              >
              <span
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >{reportData.configs?.test?.vus ||
                  reportData.configs?.test?.connections ||
                  "N/A"}</span
              >
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >App Resources</span
              >
              <span
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >{reportData.configs?.resources?.requests?.cpu || "N/A"} CPU / {formatMemory(
                  reportData.configs?.resources?.requests?.memory,
                )}</span
              >
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >DB Resources</span
              >
              <span
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >{reportData.configs?.databaseResources?.requests?.cpu || "N/A"}
                CPU / {formatMemory(
                  reportData.configs?.databaseResources?.requests?.memory,
                )}</span
              >
            </div>
          </div>
        </div>

        <div class="my-3 border-t border-white/5"></div>

        <div class="flex flex-col gap-3">
          <div
            class="flex flex-col md:flex-row items-end justify-between gap-4"
          >
            <div class="flex-1">
              <Label class="mb-1 text-xs font-medium text-gray-400"
                >Filter Competitors ({selectedCompetitors.length}/20)
                <span class="text-gray-500 text-xs ml-2 font-normal"
                  >from {allCompetitors.length} total</span
                ></Label
              >
              <MultiSelect
                items={allCompetitors.map((c) => ({ value: c, name: c }))}
                bind:value={selectedCompetitors}
                placeholder="Choose up to 20 competitors..."
                size="sm"
                class="bg-white/5 border-white/10 text-white competitor-filter"
              />
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                color="alternative"
                class="bg-white/5 hover:bg-white/10 border-white/10"
                onclick={resetCompetitors}>Reset</Button
              >
              <Button
                size="sm"
                color="alternative"
                class="bg-white/5 hover:bg-white/10 border-white/10"
                onclick={clearCompetitors}>Clear All</Button
              >
            </div>
          </div>

          <div
            class="flex flex-col md:flex-row items-end justify-between gap-4"
          >
            <div class="flex-1">
              <Label class="mb-1 text-xs font-medium text-gray-400"
                >Filter Tests ({selectedTestTypes.length}/{allTestTypes.length})</Label
              >
              <MultiSelect
                items={allTestTypes.map((t: string) => ({
                  value: t,
                  name: testTypeLabel[t] || t,
                }))}
                bind:value={selectedTestTypes}
                placeholder="Filter tests..."
                size="sm"
                class="bg-white/5 border-white/10 text-white test-filter"
              />
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                color="alternative"
                class="bg-white/5 hover:bg-white/10 border-white/10"
                onclick={resetTestTypes}>Reset</Button
              >
              <Button
                size="sm"
                color="alternative"
                class="bg-white/5 hover:bg-white/10 border-white/10"
                onclick={clearTestTypes}>Clear All</Button
              >
            </div>
          </div>
        </div>
      </Card>
      <div class="space-y-12">
        {#each testTypes as testType}
          {@const sortedRpsComps = [...competitors].sort(
            (a, b) =>
              (reportData.result[b][testType]?.requestsPerSecond || 0) -
              (reportData.result[a][testType]?.requestsPerSecond || 0),
          )}
          {@const sortedLatComps = [...competitors].sort(
            (a, b) =>
              (reportData.result[a][testType]?.latencyAverageMs || 0) -
              (reportData.result[b][testType]?.latencyAverageMs || 0),
          )}

          {@const sortedComps = getSortedCompetitors(testType)}
          {@const isNoDbTest = testType === "plaintext" || testType === "json"}
          {@const currentCols = selectedColumnsByTest[testType] || []}
          {@const availableMetrics = metricsList.filter(
            (m: any) => !(isNoDbTest && m.id.startsWith("db")),
          )}
          {@const tableMetrics = availableMetrics.filter((m: any) =>
            currentCols.includes(m.id),
          )}

          <div class="flex flex-col gap-4">
            <h2 class="text-lg font-bold text-white px-2">
              {testTypeLabel[testType] || testType}
            </h2>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card
                size="xl"
                class="max-w-none glass-panel rounded-2xl border-0 px-3 py-3"
              >
                <BarChart
                  title="Requests Per Second"
                  customLabels={sortedRpsComps}
                  datasets={[
                    {
                      label: "Req/Sec",
                      data: sortedRpsComps.map(
                        (c) =>
                          reportData.result[c][testType]?.requestsPerSecond ||
                          0,
                      ),
                      backgroundColor: sortedRpsComps.map((c) =>
                        getCompColor(c),
                      ),
                      borderRadius: 4,
                    },
                  ]}
                  yAxisLabel="Req/Sec"
                  hideYAxisLabels={false}
                />
              </Card>
              <Card
                size="xl"
                class="max-w-none glass-panel rounded-2xl border-0 px-3 py-3"
              >
                <BarChart
                  title="Average Latency (ms)"
                  customLabels={sortedLatComps}
                  datasets={[
                    {
                      label: "Latency (ms)",
                      data: sortedLatComps.map((c) =>
                        Math.round(
                          reportData.result[c][testType]?.latencyAverageMs || 0,
                        ),
                      ),
                      backgroundColor: sortedLatComps.map((c) =>
                        getCompColor(c),
                      ),
                      borderRadius: 4,
                    },
                  ]}
                  yAxisLabel="Milliseconds (ms)"
                  hideYAxisLabels={false}
                />
              </Card>
            </div>

            <Card
              size="xl"
              class="max-w-none glass-panel rounded-2xl border-0 overflow-hidden"
            >
              <div
                class="p-3 px-4 border-b border-white/5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-white/5"
              >
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                  {testTypeLabel[testType] || testType} - Detailed Metrics
                </h3>
                <div class="relative">
                  <Button
                    size="sm"
                    color="alternative"
                    class="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 dark:hover:text-white transition-colors gap-2 text-xs"
                  >
                    Filter Columns
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      ></path></svg
                    >
                  </Button>
                  <Dropdown
                    class="w-56 p-3 space-y-3 bg-slate-800 border border-white/10 shadow-xl rounded-xl"
                  >
                    <h6
                      class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1"
                    >
                      Display Metrics
                    </h6>
                    {#each availableMetrics as metric}
                      <Toggle
                        checked={selectedColumnsByTest[testType].includes(
                          metric.id,
                        )}
                        onchange={(e) =>
                          handleToggleColumn(
                            testType,
                            metric.id,
                            (e.target as HTMLInputElement).checked,
                          )}
                        class="text-sm font-medium text-slate-200 hover:text-white transition-colors w-full p-2 rounded-lg hover:bg-white/5"
                      >
                        {metric.label}
                      </Toggle>
                    {/each}
                  </Dropdown>
                </div>
              </div>

              <div class="overflow-x-auto">
                <Table
                  hoverable={true}
                  class="w-full text-left data-table whitespace-nowrap text-xs"
                >
                  <TableHead class="bg-black/20">
                    <TableHeadCell
                      onclick={() => toggleSort("name")}
                      class="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-2 px-3"
                    >
                      Competitor
                      {#if sortKey === "name"}
                        <span class="ml-1 text-primary-500 font-bold"
                          >{sortOrder === "asc" ? "↑" : "↓"}</span
                        >
                      {/if}
                    </TableHeadCell>
                    {#each tableMetrics as metric}
                      <TableHeadCell
                        onclick={() => toggleSort(metric.key)}
                        class="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-2 px-3"
                      >
                        {metric.label}
                        {#if sortKey === metric.key}
                          <span class="ml-1 text-primary-500 font-bold"
                            >{sortOrder === "asc" ? "↑" : "↓"}</span
                          >
                        {/if}
                      </TableHeadCell>
                    {/each}
                  </TableHead>
                  <TableBody>
                    {#each sortedComps as comp}
                      {#if reportData.result[comp][testType]}
                        {@const row = reportData.result[comp][testType]}
                        <TableBodyRow
                          class="text-slate-200 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                        >
                          <TableBodyCell
                            class="font-medium py-1.5 px-3"
                            style="color: {getCompColor(comp)};"
                          >
                            {comp}
                          </TableBodyCell>
                          {#each tableMetrics as metric}
                            <TableBodyCell class="py-1.5 px-3">
                              {#if metric.isComboResource}
                                <div
                                  class="inline-flex w-max items-center gap-1.5 whitespace-nowrap cursor-help relative"
                                >
                                  <span
                                    class="font-medium {getPctClass(
                                      row[metric.idleKey],
                                    )}">{metric.idlePctOut(row)}</span
                                  >
                                  <span
                                    class="text-gray-500 font-medium text-xs"
                                    >&nbsp;/&nbsp;</span
                                  >
                                  <span
                                    class="font-medium {getPctClass(
                                      row[metric.peakKey],
                                    )}">{metric.peakPctOut(row)}</span
                                  >
                                </div>
                                <Tooltip placement="top"
                                  >{metric.idleValOut(row)} / {metric.peakValOut(
                                    row,
                                  )}</Tooltip
                                >
                              {:else if metric.isResource}
                                <div
                                  class="inline-flex w-max items-center gap-2 cursor-help relative"
                                >
                                  <span
                                    class="font-medium {getPctClass(
                                      row[metric.key],
                                    )}">{metric.pct(row)}</span
                                  >
                                </div>
                                <Tooltip placement="top"
                                  >{metric.val(row)}</Tooltip
                                >
                              {:else}
                                {@const val = row[metric.key]}
                                {val !== undefined
                                  ? metric.format
                                    ? metric.format(val, row)
                                    : val
                                  : "N/A"}
                              {/if}
                            </TableBodyCell>
                          {/each}
                        </TableBodyRow>
                      {/if}
                    {/each}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="glass-panel p-8 text-center rounded-2xl border-0">
      <p class="text-gray-500 dark:text-gray-400">No report loaded.</p>
    </div>
  {/if}
</main>

<style>
  :global(.competitor-filter span.rounded-lg, .test-filter span.rounded-lg) {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    scrollbar-width: none; /* Hide scrollbar for cleaner look */
    -ms-overflow-style: none;
  }
  :global(
      .competitor-filter span.rounded-lg::-webkit-scrollbar,
      .test-filter span.rounded-lg::-webkit-scrollbar
    ) {
    display: none;
  }
  :global(
      .competitor-filter span.rounded-lg > div,
      .test-filter span.rounded-lg > div
    ) {
    flex-shrink: 0 !important;
  }
</style>
