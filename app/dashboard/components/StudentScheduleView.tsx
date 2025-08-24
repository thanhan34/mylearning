"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Schedule } from '../../../types/schedule';
import { getSchedulesByUser } from '../../firebase/services/schedule';
import ScheduleCard from './ScheduleCard';
import CalendarView from './CalendarView';
import { 
  RiCalendarLine, 
  RiSearchLine,
  RiFilterLine,
  RiGridLine,
  RiCalendar2Line
} from 'react-icons/ri';

const StudentScheduleView: React.FC = () => {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    if (session?.user?.email) {
      loadSchedules();
    }
  }, [session]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      
      const userEmail = session?.user?.email;
      if (userEmail) {
        const sanitizedEmail = userEmail.replace(/[.#$[\]]/g, '_');
        const schedulesData = await getSchedulesByUser(sanitizedEmail, 'student');
        setSchedules(schedulesData);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || schedule.type === filterType;
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Separate schedules by time
  const now = new Date();
  const upcomingSchedules = filteredSchedules.filter(schedule => new Date(schedule.startTime) > now);
  const pastSchedules = filteredSchedules.filter(schedule => new Date(schedule.endTime) < now);
  const currentSchedules = filteredSchedules.filter(schedule => 
    new Date(schedule.startTime) <= now && new Date(schedule.endTime) >= now
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fc5d01]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#fc5d01] flex items-center space-x-3">
          <RiCalendarLine className="w-8 h-8" />
          <span>Lịch học của tôi</span>
        </h1>
        
        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
              viewMode === 'calendar'
                ? 'bg-white text-[#fc5d01] shadow-sm'
                : 'text-gray-600 hover:text-[#fc5d01]'
            }`}
          >
            <RiCalendar2Line className="w-4 h-4" />
            <span>Lịch</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
              viewMode === 'list'
                ? 'bg-white text-[#fc5d01] shadow-sm'
                : 'text-gray-600 hover:text-[#fc5d01]'
            }`}
          >
            <RiGridLine className="w-4 h-4" />
            <span>Danh sách</span>
          </button>
        </div>
      </div>

      {/* Filters - Only show for list view */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm lịch học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300"
            >
              <option value="all">Tất cả loại</option>
              <option value="class">Lớp học</option>
              <option value="exam">Thi cử</option>
              <option value="meeting">Họp</option>
              <option value="other">Khác</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="cancelled">Đã hủy</option>
              <option value="completed">Hoàn thành</option>
            </select>

            <div className="flex items-center space-x-2 text-gray-600">
              <RiFilterLine className="w-5 h-5" />
              <span className="text-sm">
                {filteredSchedules.length} lịch học
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <CalendarView schedules={schedules} />
      ) : (
        <>
          {/* Current Schedules */}
          {currentSchedules.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#fc5d01] mb-4 flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span>Đang diễn ra ({currentSchedules.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    canEdit={false}
                    canDelete={false}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Schedules */}
          {upcomingSchedules.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#fc5d01] mb-4 flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span>Sắp diễn ra ({upcomingSchedules.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {upcomingSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    canEdit={false}
                    canDelete={false}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Schedules */}
          {pastSchedules.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-600 mb-4 flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Đã kết thúc ({pastSchedules.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {pastSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    canEdit={false}
                    canDelete={false}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredSchedules.length === 0 && (
            <div className="text-center py-12">
              <RiCalendarLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                  ? 'Không tìm thấy lịch học phù hợp' 
                  : 'Chưa có lịch học nào'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Lịch học sẽ được hiển thị khi giáo viên hoặc admin tạo lịch cho bạn
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentScheduleView;
