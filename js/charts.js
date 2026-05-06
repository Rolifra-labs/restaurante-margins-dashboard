import { config } from './config.js';

class ChartManager {
  constructor() {
    this.marginChart = null;
    this.salesChart = null;
  }

  initMarginChart(chartData) {
    const ctx = document.getElementById('margin-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.marginChart) {
      this.marginChart.destroy();
    }

    this.marginChart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        ...config.chartOptions,
        indexAxis: 'y',
        plugins: {
          ...config.chartOptions.plugins,
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.x.toFixed(1) + '%';
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  initSalesChart(chartData) {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.salesChart) {
      this.salesChart.destroy();
    }

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        ...config.chartOptions,
        plugins: {
          ...config.chartOptions.plugins,
          tooltip: {
            callbacks: {
              label: function(context) {
                return '€' + context.parsed.y.toFixed(2);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toFixed(0);
              }
            }
          }
        }
      }
    });
  }

  destroy() {
    if (this.marginChart) {
      this.marginChart.destroy();
      this.marginChart = null;
    }
    if (this.salesChart) {
      this.salesChart.destroy();
      this.salesChart = null;
    }
  }
}

export const charts = new ChartManager();
