import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const defaultChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#fc5d01',
      bodyColor: '#fc5d01',
      borderColor: '#fedac2',
      borderWidth: 1,
      padding: 10,
      displayColors: false,
      callbacks: {
        title: (items) => {
          if (!items.length) return '';
          const date = new Date(items[0].label);
          return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        },
        label: (item) => `Đã nộp: ${item.formattedValue} bài`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        color: '#666'
      },
      grid: {
        color: '#eee'
      }
    },
    x: {
      ticks: {
        color: '#666',
        callback: (value, index, values) => {
          const date = new Date(value);
          return date.toLocaleDateString('vi-VN', {
            month: 'numeric',
            day: 'numeric'
          });
        }
      },
      grid: {
        color: '#eee'
      }
    }
  }
};

export const defaultChartDataset = {
  backgroundColor: '#ffffff',
  borderWidth: 2,
  pointBackgroundColor: '#fc5d01',
  pointBorderColor: '#ffffff',
  pointBorderWidth: 2,
  pointRadius: 4,
  pointHoverRadius: 6,
  pointHoverBackgroundColor: '#fc5d01',
  pointHoverBorderColor: '#ffffff',
  pointHoverBorderWidth: 2,
  fill: false,
  tension: 0.4
};
