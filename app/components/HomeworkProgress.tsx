"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { useEffect, useState } from "react";
import { getHomeworkProgress } from "../firebase/services";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HomeworkProgressProps {
  studentId: string;
}

const HomeworkProgress = ({ studentId }: HomeworkProgressProps) => {
  const [progressData, setProgressData] = useState<{ date: string; completed: number }[]>([]);

  useEffect(() => {
    const fetchProgress = async () => {
      const progress = await getHomeworkProgress(studentId);
      setProgressData(progress);
    };

    if (studentId) {
      fetchProgress();
    }
  }, [studentId]);

  const chartData = {
    labels: progressData.map(item => item.date),
    datasets: [
      {
        label: "Completed Homework",
        data: progressData.map(item => item.completed),
        borderColor: "#fc5d01",
        backgroundColor: "#fedac2",
        tension: 0.4
      }
    ]
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
      <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Homework Progress</h3>
      <div className="h-64">
        <Line 
          data={chartData} 
          options={{ 
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              }
            }
          }} 
        />
      </div>
    </div>
  );
};

export default HomeworkProgress;
