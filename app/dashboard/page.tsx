'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import WelcomeHeader from './components/WelcomeHeader';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboardClient from './admin/components/AdminDashboardClient';
import TeacherStats from './teacher/components/TeacherStats';
import { getUserByEmail } from '../firebase/services/user';
import { getHomeworkSubmissions } from '../firebase/services/homework';
import { getHomeworkProgress } from '../firebase/services/progress';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
  }[];
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userRole, setUserRole] = useState('student');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<any[]>([]);
  const [homeworkProgressData, setHomeworkProgressData] = useState<ChartData>({
    labels: [],
    datasets: [{
      label: 'Tiến độ bài tập',
      data: [],
      borderColor: '#fc5d01',
      tension: 0.4
    }]
  });

  const loadHomeworkProgress = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      setIsDataLoading(true);
      const user = await getUserByEmail(session.user.email);
      if (!user) return;

      console.log('Loading progress for user:', user.id);
      const progressData = await getHomeworkProgress(user.id);
      console.log('Progress data:', progressData);

      if (!progressData.length) {
        console.log('No progress data found');
        return;
      }

      // Sort progress data by date
      const sortedData = [...progressData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log('Sorted data:', sortedData);

      const labels = sortedData.map(d => d.date);
      const data = sortedData.map(d => d.completed);
      
      console.log('Setting chart data:', { labels, data });

      setHomeworkProgressData({
        labels,
        datasets: [{
          label: 'Tiến độ bài tập',
          data,
          borderColor: '#fc5d01',
          tension: 0.4
        }]
      });
    } catch (error) {
      console.error('Error loading homework progress:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [session?.user?.email]);

  const loadHomeworkSubmissions = useCallback(async (date: string) => {
    if (!session?.user?.email) return;

    try {
      const user = await getUserByEmail(session.user.email);
      if (!user) return;

      console.log('Loading submissions for date:', date);
      const submissions = await getHomeworkSubmissions(user.id, date);
      console.log('Submissions:', submissions);

      if (submissions) {
        setHomeworkSubmissions(submissions);
      }
    } catch (error) {
      console.error('Error loading homework submissions:', error);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    
    if (session?.user) {
      const role = (session.user as any)?.role;
      setUserRole(role || 'student');
      
      if (role === 'student') {
        // Initial data load
        Promise.all([
          loadHomeworkProgress(),
          loadHomeworkSubmissions(selectedDate)
        ]).catch(error => {
          console.error('Error loading initial data:', error);
        }).finally(() => {
          setIsLoading(false);
        });

        // Set up an interval to refresh data every minute
        const intervalId = setInterval(() => {
          loadHomeworkProgress().catch(console.error);
          loadHomeworkSubmissions(selectedDate).catch(console.error);
        }, 60000); // Refresh every minute

        return () => clearInterval(intervalId);
      } else {
        setIsLoading(false);
      }
    }
  }, [status, router, session, loadHomeworkProgress, loadHomeworkSubmissions, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      loadHomeworkSubmissions(selectedDate);
    }
  }, [loadHomeworkSubmissions, selectedDate]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-white to-[#fedac2] rounded-xl p-6 shadow-lg mb-8 animate-pulse">
          <div className="h-8 w-48 bg-[#fedac2] rounded mb-2"></div>
          <div className="h-4 w-32 bg-[#fedac2] rounded opacity-70"></div>
        </div>
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
            <div className="h-6 w-32 bg-[#fedac2] rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-[#fedac2] rounded opacity-50"></div>
              <div className="h-64 bg-[#fedac2] rounded opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'admin') {
    return <AdminDashboardClient />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <WelcomeHeader 
        name={session?.user?.name || ''} 
        role={userRole}
      />
      
      {userRole === 'teacher' || userRole === 'assistant' ? (
        <TeacherStats />
      ) : (
        <StudentDashboard 
          homeworkProgressData={homeworkProgressData}
          selectedDate={selectedDate}
          homeworkSubmissions={homeworkSubmissions}
          onDateChange={setSelectedDate}
          userRole={userRole}
        />
      )}
    </div>
  );
}
