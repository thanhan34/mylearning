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
  studentId: string; // This is actually the email
}

const HomeworkProgress = ({ studentId }: HomeworkProgressProps) => {
  const [progressData, setProgressData] = useState<{ date: string; completed: number }[]>([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const progress = await getHomeworkProgress(studentId);
        
        if (progress.length > 0) {
          // Sort by date and get last 7 days
          const sortedData = progress
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 7)
            .reverse();
            
          setProgressData(sortedData);
        } else {
          setProgressData([]);
        }
      } catch (error) {
        console.error('Error fetching homework progress:', error);
        setProgressData([]);
      }
    };

    if (studentId) {
      fetchProgress();
    }
  }, [studentId]);

  // Format dates for display
  const chartData = {
    labels: progressData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
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
            },
            plugins: {
              tooltip: {
                callbacks: {
                  title: (context) => {
                    const index = context[0].dataIndex;
                    return progressData[index]?.date || '';
                  }
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
