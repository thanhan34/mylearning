"use client";

import { useEffect, useState } from "react";
import { getHomeworkProgress } from "../firebase/services";
import ChartWrapper from "@/app/components/ChartWrapper";

interface HomeworkProgressProps {
  email: string;
}

const HomeworkProgress = ({ email }: HomeworkProgressProps) => {
  console.log('HomeworkProgress mounted with email:', email);

  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  }>({
    labels: [],
    datasets: [{
      label: "Bài tập đã hoàn thành",
      data: [],
      borderColor: "#fc5d01",
      tension: 0.4
    }]
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setError(null);
        console.log('Fetching progress for:', email);
        const progress = await getHomeworkProgress(email);
        console.log('Raw progress data:', progress);
        
        if (progress.length > 0) {
          // Sort by date and get last 7 days
          const sortedData = progress
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 7)
            .reverse();

          console.log('Sorted data:', sortedData);

          setChartData({
            labels: sortedData.map(item => {
              const date = new Date(item.date);
              return date.toLocaleDateString('vi-VN', { 
                month: 'numeric', 
                day: 'numeric' 
              });
            }),
            datasets: [{
              label: "Bài tập đã hoàn thành",
              data: sortedData.map(item => item.completed),
              borderColor: "#fc5d01",
              tension: 0.4
            }]
          });
        } else {
          console.log('No progress data found');
          setError('Chưa có dữ liệu');
        }
      } catch (error) {
        console.error('Error fetching homework progress:', error);
        setError('Không thể tải dữ liệu');
        setChartData({
          labels: [],
          datasets: [{
            label: "Bài tập đã hoàn thành",
            data: [],
            borderColor: "#fc5d01",
            tension: 0.4
          }]
        });
      }
    };

    if (email) {
      fetchProgress();
      const intervalId = setInterval(fetchProgress, 60000);
      return () => clearInterval(intervalId);
    }
  }, [email]);

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
      <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Tiến độ học tập</h3>
      {error ? (
        <div className="text-center text-gray-500 py-4">{error}</div>
      ) : (
        <div className="h-64">
          <ChartWrapper data={chartData} />
        </div>
      )}
    </div>
  );
};

export default HomeworkProgress;
