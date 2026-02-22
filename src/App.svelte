<script lang="ts">
  import { onMount, tick } from 'svelte';
  import BarChart from './lib/BarChart.svelte';

  // Dynamic import of all reports using Vite's glob import
  // Setting import to 'default' means we get a promise that resolves
  // to the default export (which is the JSON content itself)
  const reportModules = import.meta.glob('../reports/*.json', { import: 'default' });

  let availableReports: string[] = $state([]);
  let selectedReportName: string | null = $state(null);
  let reportData: any = $state(null);
  let loading: boolean = $state(true);

  // Derived state for charts and tables
  let competitors = $derived(reportData ? Object.keys(reportData.result) : []);
  let testTypes = $derived(reportData?.configs?.test?.types || []);

  const chartColors = [
    'rgba(56, 189, 248, 0.8)',   // accent-primary
    'rgba(129, 140, 248, 0.8)',  // accent-secondary
    'rgba(52, 211, 153, 0.8)',   // green
    'rgba(251, 191, 36, 0.8)',   // yellow
    'rgba(248, 113, 113, 0.8)',  // red
    'rgba(192, 132, 252, 0.8)',  // purple
  ];

  let rpsDatasets = $derived(
    reportData && competitors.length > 0 ? competitors.map((comp, i) => {
       return {
         label: comp,
         data: testTypes.map((t: string) => reportData.result[comp][t]?.requestsPerSecond || 0),
         backgroundColor: chartColors[i % chartColors.length],
         borderRadius: 4
       };
    }) : []
  );

  let latencyDatasets = $derived(
    reportData && competitors.length > 0 ? competitors.map((comp, i) => {
       return {
         label: comp,
         data: testTypes.map((t: string) => Math.round((reportData.result[comp][t]?.avgResponseTimeSecs || 0) * 1000)), // converted to ms
         backgroundColor: chartColors[i % chartColors.length],
         borderRadius: 4
       };
    }) : []
  );

  const metricsList = [
    { key: 'totalRequests', label: 'Total Requests' },
    { key: 'requestsPerSecond', label: 'Req/Sec' },
    { key: 'avgResponseTimeSecs', label: 'Avg Latency', format: (v: number) => v.toFixed(4) + 's' },
    { key: 'maxResponseTimeSecs', label: 'Max Latency', format: (v: number) => v.toFixed(4) + 's' },
    { key: 'errorRatePercent', label: 'Error Rate', format: (v: number) => v + '%' },
    { key: 'peakCpuUsage', label: 'Peak CPU', format: (v: number) => v + 'm' },
    { key: 'peakMemoryUsage', label: 'Peak Mem', format: (v: number) => v + 'MB' },
    { key: 'peakConnectionCount', label: 'Peak DB Conn' }
  ];

  onMount(async () => {
    // Extract filename from the path
    availableReports = Object.keys(reportModules).map(path => {
      const parts = path.split('/');
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
  let sortKey: string = $state('requestsPerSecond');
  let sortOrder: 'asc' | 'desc' = $state('desc');

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortOrder = 'desc';
    }
  }

  function getSortedCompetitors(testType: string) {
    if (!reportData) return [];

    return [...competitors].sort((a, b) => {
      let valA: any, valB: any;

      if (sortKey === 'name') {
        valA = a;
        valB = b;
      } else {
        valA = reportData.result[a][testType]?.[sortKey];
        valB = reportData.result[b][testType]?.[sortKey];
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let modifier = sortOrder === 'asc' ? 1 : -1;
      if (typeof valA === 'string') {
          return valA.localeCompare(valB) * modifier;
      }
      return (valA - valB) * modifier;
    });
  }
</script>

<main>
  <header class="glass-card">
    <div class="header-left">
      <h1>Web Benchmarks Viewer</h1>
    </div>
    <div class="controls">
      <div class="control-group">
        <label for="report-select">Select Local Report:</label>
        <select id="report-select" value={selectedReportName} onchange={handleSelectChange}>
          <option value="" disabled selected={!selectedReportName}>-- Select Report --</option>
          {#each availableReports as report}
            <option value={report}>{report}</option>
          {/each}
        </select>
      </div>

      <div class="divider"></div>

      <div class="control-group">
        <label for="file-upload" class="upload-btn">
          Upload External
        </label>
        <input id="file-upload" type="file" accept=".json" onchange={handleFileUpload} />
      </div>
    </div>
  </header>

  {#if loading}
    <div class="loading glass-card">
      <div class="spinner"></div>
      <p>Loading report data...</p>
    </div>
  {:else if reportData}
    <div class="dashboard-content">
      <div class="summary glass-card">
        <h2>Configuration Summary</h2>
        <div class="summary-grid">
           <div class="stat-box">
             <span class="label">Start Time</span>
             <span class="value">{new Date(reportData.startTime).toLocaleString()}</span>
           </div>
           <div class="stat-box">
             <span class="label">End Time</span>
             <span class="value">{new Date(reportData.endTime).toLocaleString()}</span>
           </div>
           <div class="stat-box">
             <span class="label">Duration</span>
             <span class="value">{reportData.configs?.test?.duration || 'N/A'}</span>
           </div>
           <div class="stat-box">
             <span class="label">Connections</span>
             <span class="value">{reportData.configs?.test?.connections || 'N/A'}</span>
           </div>
           <div class="stat-box">
             <span class="label">Threads</span>
             <span class="value">{reportData.configs?.test?.threads || 'N/A'}</span>
           </div>
           <div class="stat-box">
             <span class="label">DB Resources (Req)</span>
             <span class="value">{reportData.configs?.databaseResources?.requests?.cpu || 'N/A'} CPU / {reportData.configs?.databaseResources?.requests?.memory || 'N/A'} Mem</span>
           </div>
           <div class="stat-box">
             <span class="label">App Resources (Req)</span>
             <span class="value">{reportData.configs?.resources?.requests?.cpu || 'N/A'} CPU / {reportData.configs?.resources?.requests?.memory || 'N/A'} Mem</span>
           </div>
        </div>
      </div>

      <div class="charts-container">
         <div class="chart-card glass-card">
            <BarChart
               title="Requests Per Second"
               customLabels={testTypes}
               datasets={rpsDatasets}
               yAxisLabel="Req/Sec"
            />
         </div>
         <div class="chart-card glass-card">
            <BarChart
               title="Average Latency (ms)"
               customLabels={testTypes}
               datasets={latencyDatasets}
               yAxisLabel="Milliseconds (ms)"
            />
         </div>
      </div>

      <div class="tables-container">
         {#each testTypes as testType}
           {@const sortedComps = getSortedCompetitors(testType)}
           <div class="table-card glass-card">
              <h3>{testType} - Detailed Metrics</h3>
              <div class="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th onclick={() => toggleSort('name')} class="sortable">
                        Competitor
                        {#if sortKey === 'name'}
                          <span class="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        {/if}
                      </th>
                      {#each metricsList as metric}
                        <th onclick={() => toggleSort(metric.key)} class="sortable">
                          {metric.label}
                          {#if sortKey === metric.key}
                            <span class="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          {/if}
                        </th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each sortedComps as comp}
                      {#if reportData.result[comp][testType]}
                        <tr>
                          <td class="comp-name">{comp}</td>
                          {#each metricsList as metric}
                            {@const val = reportData.result[comp][testType][metric.key]}
                            <td>{val !== undefined ? (metric.format ? metric.format(val) : val) : 'N/A'}</td>
                          {/each}
                        </tr>
                      {/if}
                    {/each}
                  </tbody>
                </table>
              </div>
           </div>
         {/each}
      </div>
    </div>
  {:else}
    <div class="glass-card" style="padding: 2rem; text-align: center;">
      <p>No report loaded.</p>
    </div>
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .control-group label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  select {
    background: rgba(15, 23, 42, 0.8);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.875rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  select:focus, select:hover {
    border-color: var(--accent-primary);
  }

  .divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
  }

  input[type="file"] {
    display: none;
  }

  .upload-btn {
    background: rgba(56, 189, 248, 0.1);
    color: var(--accent-primary);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .upload-btn:hover {
    background: rgba(56, 189, 248, 0.2);
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
  }

  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .summary {
    padding: 1.5rem 2rem;
  }

  .summary h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.125rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(208px, 1fr));
    gap: 1.5rem;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(15, 23, 42, 0.5);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .stat-box .label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-box .value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .charts-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .chart-card {
     padding: 1.5rem;
  }

  .tables-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .table-card {
    padding: 1.5rem;
  }

  .table-card h3 {
    margin-top: 0;
    margin-bottom: 1.25rem;
    font-size: 1.125rem;
    color: var(--text-primary);
    font-weight: 500;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 0.75rem;
  }

  .table-responsive {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.875rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  th.sortable {
    cursor: pointer;
    user-select: none;
    transition: color 0.2s, background-color 0.2s;
    position: relative;
  }

  th.sortable:hover {
    color: var(--accent-primary);
    background-color: rgba(255, 255, 255, 0.02);
  }

  .sort-icon {
    display: inline-block;
    margin-left: 4px;
    color: var(--accent-primary);
    font-weight: bold;
  }

  tbody tr {
    transition: background-color 0.2s;
  }

  tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  .comp-name {
    font-weight: 500;
    color: var(--accent-primary);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    gap: 1rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
