'use client';

interface SubmissionsCalendarProps {
  selectedDate: string;
  submissionDates: { [key: string]: number };
  onDateChange: (date: string) => void;
}

export default function SubmissionsCalendar({ selectedDate, submissionDates, onDateChange }: SubmissionsCalendarProps) {
  const currentDate = new Date(selectedDate);
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const days = Array.from({ length: lastDay.getDate() }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return date.toISOString().split('T')[0];
  });

  return (
    <div className="w-[280px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#fc5d01] font-medium">
          {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const prevMonth = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
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
              const nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
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
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay.getDay() }, (_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-200 aspect-square" />
          ))}
          {days.map(date => {
            const hasSubmission = submissionDates[date];
            return (
              <button
                key={date}
                onClick={() => hasSubmission && onDateChange(date)}
                className={`border-b border-r border-gray-200 aspect-square relative transition-colors ${
                  hasSubmission
                    ? selectedDate === date
                      ? 'bg-[#fc5d01] text-white hover:bg-[#fd7f33]'
                      : 'hover:bg-[#fedac2]'
                    : 'text-gray-400'
                }`}
              >
                <span className="absolute top-1 left-1 text-xs">
                  {new Date(date).getDate()}
                </span>
                {hasSubmission && (
                  <span className="absolute bottom-1 right-1 flex gap-0.5">
                    {Array.from({ length: Math.min(submissionDates[date], 3) }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`w-1 h-1 rounded-full ${
                          selectedDate === date ? 'bg-white' : 'bg-[#fc5d01]'
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
