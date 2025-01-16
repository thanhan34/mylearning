'use client';

import { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartWrapperProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  };
  options?: ChartOptions<'line'>;
  className?: string;
}

export default function ChartWrapper({ data, options, className = 'h-64' }: ChartWrapperProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    // Log data to verify it's being passed correctly
    console.log('Chart data:', data);
    console.log('Chart instance:', chartRef.current);
  }, [data]);

  const defaultOptions: ChartOptions<'line'> = {
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
          color: '#666'
        },
        grid: {
          color: '#eee'
        }
      }
    }
  };

  const chartData: ChartData<'line'> = {
    labels: data.labels,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
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
      fill: false
    }))
  };

  return (
    <div className={className}>
      {data.datasets[0].data.length > 0 ? (
        <Line 
          ref={chartRef}
          data={chartData}
          options={options || defaultOptions}
          redraw={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Chưa có dữ liệu
        </div>
      )}
    </div>
  );
}
