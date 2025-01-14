'use client';

import { Line } from 'react-chartjs-2';

interface ProgressChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  };
}

export default function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Tiến độ học tập</h3>
      <div className="h-64">
        <Line 
          data={data} 
          options={{ 
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
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
          }} 
        />
      </div>
    </div>
  );
}
