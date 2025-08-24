"use client";

import React, { useState, useEffect } from 'react';
import { Schedule } from '../../../types/schedule';
import { renderTextWithLinks } from '../../utils/linkUtils';
import ScheduleDetailModal from './ScheduleDetailModal';
import { 
  RiCalendarLine, 
  RiTimeLine, 
  RiMapPinLine, 
  RiFileTextLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiUserLine,
  RiTeamLine
} from 'react-icons/ri';

interface CalendarViewProps {
  schedules: Schedule[];
  onScheduleClick?: (schedule: Schedule) => void;
  onScheduleEdit?: (schedule: Schedule) => void;
  onScheduleDelete?: (scheduleId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  schedules, 
  onScheduleClick, 
  onScheduleEdit, 
  onScheduleDelete, 
  canEdit = false, 
  canDelete = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSchedule, setModalSchedule] = useState<Schedule | null>(null);

  // Get the next upcoming schedule
  const getNextSchedule = () => {
    const now = new Date();
    const upcomingSchedules = schedules
      .filter(schedule => new Date(schedule.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return upcomingSchedules[0] || null;
  };

  useEffect(() => {
    const nextSchedule = getNextSchedule();
    if (nextSchedule) {
      setSelectedSchedule(nextSchedule);
    }
  }, [schedules]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.startTime);
      return scheduleDate.toDateString() === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScheduleTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam': return 'bg-red-100 text-red-800 border-red-200';
      case 'meeting': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case 'class': return 'Lớp học';
      case 'exam': return 'Thi cử';
      case 'meeting': return 'Họp';
      default: return 'Khác';
    }
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-gray-500 hover:text-[#fc5d01] hover:bg-[#fedac2] rounded-lg transition-all duration-300"
              >
                <RiArrowLeftLine className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-gray-500 hover:text-[#fc5d01] hover:bg-[#fedac2] rounded-lg transition-all duration-300"
              >
                <RiArrowRightLine className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="h-24 p-1"></div>;
              }

              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const daySchedules = getSchedulesForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`h-24 p-1 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-[#fedac2] bg-opacity-30 border-[#fc5d01]' : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-[#fc5d01]' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {daySchedules.slice(0, 2).map((schedule, idx) => (
                      <div
                        key={schedule.id}
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setModalSchedule(schedule);
                          setIsModalOpen(true);
                          onScheduleClick?.(schedule);
                        }}
                        className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate"
                        style={{
                          backgroundColor: schedule.type === 'exam' ? '#fef2f2' : 
                                         schedule.type === 'class' ? '#eff6ff' : 
                                         schedule.type === 'meeting' ? '#f0fdf4' : '#f9fafb',
                          color: schedule.type === 'exam' ? '#dc2626' : 
                                schedule.type === 'class' ? '#2563eb' : 
                                schedule.type === 'meeting' ? '#16a34a' : '#374151',
                          border: `1px solid ${
                            schedule.type === 'exam' ? '#fecaca' : 
                            schedule.type === 'class' ? '#bfdbfe' : 
                            schedule.type === 'meeting' ? '#bbf7d0' : '#e5e7eb'
                          }`
                        }}
                        title={`${formatTime(schedule.startTime)} ${schedule.title}`}
                      >
                        {formatTime(schedule.startTime)} {schedule.title}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{daySchedules.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schedule Details Card */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
          <h3 className="text-lg font-semibold text-[#fc5d01] mb-4 flex items-center space-x-2">
            <RiCalendarLine className="w-5 h-5" />
            <span>Lịch học gần nhất</span>
          </h3>

          {selectedSchedule ? (
            <div className="space-y-4">
              {/* Schedule Type Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getScheduleTypeColor(selectedSchedule.type)}`}>
                  {getScheduleTypeLabel(selectedSchedule.type)}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedSchedule.status === 'active' ? 'Hoạt động' : 
                   selectedSchedule.status === 'cancelled' ? 'Đã hủy' : 'Hoàn thành'}
                </span>
              </div>

              {/* Title */}
              <div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">
                  {selectedSchedule.title}
                </h4>
                {selectedSchedule.description && (
                  <div className="text-gray-600 text-sm">
                    {renderTextWithLinks(selectedSchedule.description)}
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-700">
                  <RiCalendarLine className="w-4 h-4 text-[#fc5d01]" />
                  <span className="text-sm font-medium">
                    {formatDate(selectedSchedule.startTime)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <RiTimeLine className="w-4 h-4 text-[#fc5d01]" />
                  <span className="text-sm">
                    {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                  </span>
                </div>
              </div>

              {/* Location */}
              {selectedSchedule.location && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <RiMapPinLine className="w-4 h-4 text-[#fc5d01]" />
                  <span className="text-sm">{selectedSchedule.location}</span>
                </div>
              )}

              {/* Additional Info */}
              <div className="pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  {selectedSchedule.classIds && selectedSchedule.classIds.length > 0 && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <RiTeamLine className="w-4 h-4" />
                      <span className="text-xs">
                        {selectedSchedule.classIds.length} lớp học
                      </span>
                    </div>
                  )}
                  {selectedSchedule.teacherIds && selectedSchedule.teacherIds.length > 0 && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <RiUserLine className="w-4 h-4" />
                      <span className="text-xs">
                        {selectedSchedule.teacherIds.length} giáo viên
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown */}
              <div className="bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white rounded-lg p-3 text-center">
                <div className="text-xs opacity-90 mb-1">Bắt đầu sau</div>
                <div className="text-lg font-bold">
                  {(() => {
                    const now = new Date();
                    const start = new Date(selectedSchedule.startTime);
                    const diff = start.getTime() - now.getTime();
                    
                    if (diff <= 0) return 'Đã bắt đầu';
                    
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (days > 0) return `${days} ngày ${hours} giờ`;
                    if (hours > 0) return `${hours} giờ ${minutes} phút`;
                    return `${minutes} phút`;
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <RiCalendarLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có lịch học nào</p>
              <p className="text-gray-400 text-sm mt-1">
                Lịch học sẽ hiển thị khi có lịch được tạo
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {modalSchedule && (
        <ScheduleDetailModal
          schedule={modalSchedule}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalSchedule(null);
          }}
          onEdit={canEdit ? onScheduleEdit : undefined}
          onDelete={canDelete ? onScheduleDelete : undefined}
        />
      )}
    </div>
  );
};

export default CalendarView;
