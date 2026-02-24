<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Chart from "chart.js/auto";

  let {
    title,
    customLabels,
    datasets,
    yAxisLabel = "",
    hideYAxisLabels = false,
  } = $props<{
    title: string;
    customLabels: string[];
    datasets: any[];
    yAxisLabel?: string;
    hideYAxisLabels?: boolean;
  }>();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  let visibleCount = $state(0);

  $effect(() => {
    if (datasets) {
      visibleCount = datasets.length;
    }
  });

  let chartHeight = $derived(
    Math.max(200, (customLabels?.length || 0) * visibleCount * 18 + 60),
  );

  function initChart() {
    if (chart) {
      chart.destroy();
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    visibleCount = datasets?.length || 0;

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: customLabels,
        datasets: datasets,
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            color: "#f8fafc",
            font: { size: 13, family: "Inter", weight: 500 },
            padding: { bottom: 8 },
          },
          legend: {
            display: datasets && datasets.length > 1,
            position: "bottom",
            labels: {
              color: "#94a3b8",
              font: { family: "Inter", size: 11 },
              boxWidth: 12,
              padding: 8,
            },
            onClick: function (_, legendItem, legend) {
              const index = legendItem.datasetIndex;
              if (index === undefined) return;
              const ci = legend.chart;
              if (ci.isDatasetVisible(index)) {
                ci.hide(index);
              } else {
                ci.show(index);
              }

              let count = 0;
              for (let i = 0; i < ci.data.datasets.length; i++) {
                if (ci.isDatasetVisible(i)) count++;
              }
              visibleCount = count;
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            padding: 8,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#94a3b8", font: { family: "Inter", size: 11 } },
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel,
              color: "#94a3b8",
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              display: !hideYAxisLabels,
              color: "#94a3b8",
              font: { family: "Inter", size: 11 },
            },
            afterFit(scale: any) {
              if (!hideYAxisLabels && customLabels?.length) {
                // Measure each label with the canvas API so the y-axis always
                // reserves enough space, even before custom fonts are cached.
                const ctx = scale.chart.ctx;
                ctx.save();
                ctx.font = "12px Inter, sans-serif";
                const maxWidth = customLabels.reduce(
                  (max: number, label: string) => {
                    const w = ctx.measureText(String(label)).width;
                    return w > max ? w : max;
                  },
                  0,
                );
                ctx.restore();
                // Add 12px right-side gap between label and bar
                scale.width = Math.max(scale.width, Math.ceil(maxWidth) + 12);
              }
            },
          },
        },
      },
    });
  }

  $effect(() => {
    // Re-init chart when reactive props change
    if (customLabels && datasets && canvas) {
      initChart();
    }
  });

  onMount(() => {
    initChart();
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
</script>

<div class="chart-container" style="height: {chartHeight}px">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
  }
</style>
