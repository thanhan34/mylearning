'use client';

import { useEffect, useState } from 'react';
import { SHADOWING_LINKS } from '../../constants/shadowingLinks';
import { DAILY_MESSAGES } from '../../constants/dailyMessages';

interface DailyMessage {
    message: React.ReactNode;
    shadowingLink: string;
}

const DailyHome = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        return new Date(vietnamTime);
    });
    const [currentMessage, setCurrentMessage] = useState<DailyMessage | null>(null);

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

        // Check if it's time to show message (7 AM Vietnam time)
        const checkTime = () => {
            const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
            const vietnamDate = new Date(vietnamTime);
            const hours = vietnamDate.getHours();
            const minutes = vietnamDate.getMinutes();

            if (hours === 7 && minutes === 0) {
                setSelectedDate(vietnamDate);
                updateMessage(vietnamDate);
            }
        };

        // Check every minute
        const interval = setInterval(checkTime, 60000);

        return () => clearInterval(interval);
    }, [selectedDate]);

    const navigateDay = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setSelectedDate(newDate);
    };

    if (!currentMessage) return null;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#fc5d01]">Daily Homework</h2>
                    <p className="text-[#fd7f33] text-sm">
                        {selectedDate.toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            timeZone: 'Asia/Ho_Chi_Minh'
                        })}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigateDay('prev')}
                        className="px-4 py-2 bg-[#fc5d01] text-white rounded hover:bg-[#fd7f33] transition-colors"
                    >
                        Previous Day
                    </button>
                    <button
                        onClick={() => {
                            const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
                            setSelectedDate(new Date(vietnamTime));
                        }}
                        className="px-4 py-2 bg-[#fedac2] text-[#fc5d01] rounded hover:bg-[#fdbc94] transition-colors"
                    >
                        Today
                    </button>
                    <button 
                        onClick={() => navigateDay('next')}
                        className="px-4 py-2 bg-[#fc5d01] text-white rounded hover:bg-[#fd7f33] transition-colors"
                    >
                        Next Day
                    </button>
                </div>
            </div>
            {currentMessage.message}
        </div>
    );
};

export default DailyHome;
