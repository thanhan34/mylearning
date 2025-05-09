'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { SHADOWING_LINKS } from '../../../constants/shadowingLinks';
import { DAILY_MESSAGES } from '../../../constants/dailyMessages';

interface DailyTarget {
  id: number;
  type: string;
  target: number;
  completed: number;
  source: string;
  link: string;
}


interface DailyMessage {
  message: React.ReactNode;
  shadowingLink: string;
}

const defaultTargets: DailyTarget[] = [
  { id: 1, type: 'Read aloud', target: 20, completed: 0, source: 'Shadowing', link: '' },
  { id: 2, type: 'Repeat sentence', target: 20, completed: 0, source: 'PTE Repeat Sentence', link: '' },
  { id: 3, type: 'Describe image', target: 5, completed: 0, source: '', link: '' },
  { id: 4, type: 'Retell lecture', target: 5, completed: 0, source: '', link: '' },
  { id: 5, type: 'R&W: Fill in the blanks', target: 20, completed: 0, source: '', link: '' },
  { id: 6, type: 'Reoder paragraphs', target: 20, completed: 0, source: '', link: '' },
  { id: 7, type: 'Fill in the blanks', target: 20, completed: 0, source: '', link: '' },
  { id: 8, type: 'Highlight incorrect words', target: 5, completed: 0, source: '', link: '' },
  { id: 9, type: 'Write from dictation', target: 20, completed: 0, source: 'PTE Write From Dictation', link: '' }
];

const TeacherDailyHomework = () => {
  const { data: session } = useSession();
  const [targets, setTargets] = useState<DailyTarget[]>(defaultTargets);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    return new Date(vietnamTime);
  });
  const [currentMessage, setCurrentMessage] = useState<DailyMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateMessage = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    
    // Calculate the link index based on the number of days since Jan 1, 2024
    const startDate = new Date('2024-01-01');
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const linkIndex = daysDiff % SHADOWING_LINKS.length; // Cycle through all links
    const shadowingLink = SHADOWING_LINKS[linkIndex];
    
    const message = DAILY_MESSAGES[dayName as keyof typeof DAILY_MESSAGES](shadowingLink);
    setCurrentMessage({ message, shadowingLink });
  };

  useEffect(() => {
    updateMessage(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const docRef = await getDoc(doc(db, 'settings', 'dailyTargets'));
        
        if (docRef.exists()) {
          const data = docRef.data();
          
          if (data.targets) {
            // Ensure all required fields exist
            const mergedTargets = defaultTargets.map(defaultTarget => {
              const firebaseTarget = data.targets.find((t: any) => t.id === defaultTarget.id);
              if (!firebaseTarget) return defaultTarget;

              // Ensure all fields exist with defaults if missing
              return {
                id: defaultTarget.id,
                type: defaultTarget.type,
                target: firebaseTarget.target || defaultTarget.target,
                completed: 0, // Reset completed for teacher view
                source: firebaseTarget.source || defaultTarget.source || '',
                link: firebaseTarget.link || defaultTarget.link || ''
              };
            });
            setTargets(mergedTargets);
          }
        }
      } catch (error) {
        console.error('Error fetching targets:', error);
        setError('Lỗi khi tải dữ liệu mục tiêu hàng ngày');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargets();
  }, []);


  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-4 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium">Đã xảy ra lỗi</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg animate-pulse">
          <div className="h-6 sm:h-8 w-36 sm:w-48 bg-[#fedac2] rounded mb-4"></div>
          <div className="h-48 sm:h-64 bg-[#fedac2] rounded opacity-30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Date Navigation and Daily Homework */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#fc5d01]">Daily Homework</h2>
            <p className="text-[#fd7f33] text-xs sm:text-sm">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Ho_Chi_Minh'
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button 
              onClick={() => navigateDay('prev')}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#fc5d01] text-white text-sm rounded hover:bg-[#fd7f33] transition-colors flex-1 sm:flex-none"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
                setSelectedDate(new Date(vietnamTime));
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#fedac2] text-[#fc5d01] text-sm rounded hover:bg-[#fdbc94] transition-colors flex-1 sm:flex-none"
            >
              Today
            </button>
            <button 
              onClick={() => navigateDay('next')}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#fc5d01] text-white text-sm rounded hover:bg-[#fd7f33] transition-colors flex-1 sm:flex-none"
            >
              Next
            </button>
          </div>
        </div>
        
        {/* Daily Homework Content */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-[#fedac2] bg-opacity-10 rounded-lg">
          {currentMessage ? currentMessage.message : (
            <p className="text-gray-500">Không thể tải nội dung bài tập. Vui lòng thử lại sau.</p>
          )}
        </div>
      </div>

      {/* Daily Targets */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#fc5d01]">Daily Targets</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#fedac2]">
                  <th className="py-2 px-2 sm:px-4 text-left text-[#fc5d01] text-xs sm:text-sm">NO</th>
                  <th className="py-2 px-2 sm:px-4 text-left text-[#fc5d01] text-xs sm:text-sm">TYPE</th>
                  <th className="py-2 px-2 sm:px-4 text-left text-[#fc5d01] text-xs sm:text-sm">Target</th>
                  <th className="py-2 px-2 sm:px-4 text-left text-[#fc5d01] text-xs sm:text-sm">Source</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.id} className="border-b border-[#fedac2] hover:bg-[#fedac2] hover:bg-opacity-10">
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">{target.id}</td>
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">{target.type}</td>
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">{target.target}</td>
                    <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">
                      {target.link ? (
                        <a 
                          href={target.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#fc5d01] hover:text-[#fd7f33] underline"
                        >
                          {target.source}
                        </a>
                      ) : (
                        target.source || '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TeacherDailyHomework;
