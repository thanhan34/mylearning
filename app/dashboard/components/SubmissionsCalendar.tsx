'use client';

import { format, startOfMonth, getDay, getDaysInMonth } from 'date-fns';

interface SubmissionsCalendarProps {
  selectedDate: string;
  submissionDates: { [key: string]: number };
  onDateChange: (date: string) => void;
}

export default function SubmissionsCalendar({ selectedDate, submissionDates, onDateChange }: SubmissionsCalendarProps) {
  const currentDate = new Date(selectedDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get the number of days in the current month using date-fns
  const daysInMonth = getDaysInMonth(currentDate);
  
  // Function to format a date as YYYY-MM-DD
  const formatDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    return format(date, 'yyyy-MM-dd');
  };
  
  // Generate dates for the current month
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    return formatDate(year, month, i + 1);
  });
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Day headers in Vietnamese format
  const dayHeaders = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  
  // Calculate the first day of the month using date-fns
  const firstDayOfMonth = startOfMonth(currentDate);
  
  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = getDay(firstDayOfMonth);
  
  // Calculate empty days based on the day headers
  const emptyDays = dayOfWeek;

  return (
    <div className="w-[280px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#fc5d01] font-medium">
          {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const prevMonth = new Date(currentDate);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              onDateChange(prevMonth.toISOString().split('T')[0]);
            }}
            className="p-1 rounded hover:bg-[#fedac2] text-[#fc5d01]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              const nextMonth = new Date(currentDate);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              onDateChange(nextMonth.toISOString().split('T')[0]);
            }}
            className="p-1 rounded hover:bg-[#fedac2] text-[#fc5d01]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {dayHeaders.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {/* Calculate empty cells for the first row (Sunday-based) */}
          {Array.from({ length: emptyDays }, (_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-200 aspect-square" />
          ))}
          
          {/* Render the dates */}
          {dates.map(date => {
            const hasSubmission = submissionDates[date] > 0;
            const isToday = date === today;
            const isSelected = date === selectedDate;
            
            return (
              <button
                key={date}
                onClick={() => onDateChange(date)}
                className={`border-b border-r border-gray-200 aspect-square relative transition-colors ${
                  isSelected
                    ? 'bg-[#fc5d01] text-white hover:bg-[#fd7f33]'
                    : hasSubmission
                    ? 'hover:bg-[#fedac2]'
                    : 'text-gray-400'
                } ${isToday ? 'font-bold' : ''}`}
              >
                <span className="absolute top-1 left-1 text-xs">
                  {parseInt(date.split('-')[2], 10)}
                </span>
                {hasSubmission && (
                  <span className="absolute bottom-1 right-1 flex gap-0.5">
                    {Array.from({ length: Math.min(submissionDates[date], 3) }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-[#fc5d01]'
                        }`} 
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
