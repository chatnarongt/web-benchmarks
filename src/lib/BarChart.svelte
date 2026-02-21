<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';

  let { title, customLabels, datasets, yAxisLabel = '' } = $props<{
    title: string;
    customLabels: string[];
    datasets: any[];
    yAxisLabel?: string;
  }>();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function initChart() {
    if (chart) {
      chart.destroy();
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: customLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            color: '#f8fafc',
            font: { size: 16, family: 'Inter', weight: '500' },
            padding: { bottom: 20 }
          },
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter' } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter' } },
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel,
              color: '#94a3b8'
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Inter' } }
          }
        }
      }
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

<div class="chart-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 400px;
  }
</style>
