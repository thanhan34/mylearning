'use client';

import ChartWrapper from '@/app/components/ChartWrapper';

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
      <ChartWrapper data={data} />
    </div>
  );
}
