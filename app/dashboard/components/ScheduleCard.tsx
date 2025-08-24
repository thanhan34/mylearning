"use client";

import React from 'react';
import { Schedule } from '../../../types/schedule';
import { renderTextWithLinks } from '../../utils/linkUtils';
import { 
  RiCalendarLine, 
  RiTimeLine, 
  RiMapPinLine, 
  RiFileTextLine,
  RiEditLine,
  RiDeleteBinLine,
  RiTeamLine,
  RiUserLine,
  RiEyeLine
} from 'react-icons/ri';

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (scheduleId: string) => void;
  onView?: (schedule: Schedule) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  showActions?: boolean;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onView,
  canEdit = false,
  canDelete = false,
  showActions = true
}) => {
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('vi-VN'),
      time: date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'class': return 'Lớp học';
      case 'exam': return 'Thi cử';
      case 'meeting': return 'Họp';
      case 'other': return 'Khác';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 text-blue-800';
      case 'exam': return 'bg-red-100 text-red-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Hoạt động';
      case 'cancelled': return 'Đã hủy';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  const startDateTime = formatDateTime(schedule.startTime);
  const endDateTime = formatDateTime(schedule.endTime);
  const isUpcoming = new Date(schedule.startTime) > new Date();
  const isPast = new Date(schedule.endTime) < new Date();

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-bold text-[#fc5d01] line-clamp-2">
                {schedule.title}
              </h3>
              <div className="flex space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(schedule.type)}`}>
                  {getTypeLabel(schedule.type)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                  {getStatusLabel(schedule.status)}
                </span>
              </div>
            </div>
            
            {schedule.description && (
              <div className="text-gray-600 text-sm line-clamp-2 mb-3">
                {renderTextWithLinks(schedule.description)}
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex items-center space-x-2 ml-4">
              {onView && (
                <button
                  onClick={() => onView(schedule)}
                  className="p-2 text-gray-500 hover:text-[#fc5d01] hover:bg-[#fedac2] rounded-lg transition-all duration-300"
                  title="Xem chi tiết"
                >
                  <RiEyeLine className="w-4 h-4" />
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  onClick={() => onEdit(schedule)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                  title="Chỉnh sửa"
                >
                  <RiEditLine className="w-4 h-4" />
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={() => onDelete(schedule.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                  title="Xóa"
                >
                  <RiDeleteBinLine className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Time Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#fedac2] rounded-lg">
              <RiTimeLine className="w-4 h-4 text-[#fc5d01]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Bắt đầu</p>
              <p className="text-sm text-gray-600">
                {startDateTime.date} - {startDateTime.time}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#fedac2] rounded-lg">
              <RiTimeLine className="w-4 h-4 text-[#fc5d01]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Kết thúc</p>
              <p className="text-sm text-gray-600">
                {endDateTime.date} - {endDateTime.time}
              </p>
            </div>
          </div>
        </div>

        {/* Location */}
        {schedule.location && (
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#fedac2] rounded-lg">
              <RiMapPinLine className="w-4 h-4 text-[#fc5d01]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Địa điểm</p>
              <p className="text-sm text-gray-600">{schedule.location}</p>
            </div>
          </div>
        )}

        {/* Participants Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          {schedule.classIds && schedule.classIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <RiTeamLine className="w-4 h-4 text-[#fc5d01]" />
              <span className="text-sm text-gray-600">
                {schedule.classIds.length} lớp học
              </span>
            </div>
          )}

          {schedule.teacherIds && schedule.teacherIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <RiUserLine className="w-4 h-4 text-[#fc5d01]" />
              <span className="text-sm text-gray-600">
                {schedule.teacherIds.length} giáo viên
              </span>
            </div>
          )}

          {schedule.studentIds && schedule.studentIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <RiUserLine className="w-4 h-4 text-[#fc5d01]" />
              <span className="text-sm text-gray-600">
                {schedule.studentIds.length} học viên
              </span>
            </div>
          )}
        </div>

        {/* Time Status Indicator */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isPast ? 'bg-gray-400' : isUpcoming ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            <span className="text-sm text-gray-600">
              {isPast ? 'Đã kết thúc' : isUpcoming ? 'Sắp diễn ra' : 'Đang diễn ra'}
            </span>
          </div>

          {schedule.googleEventId && (
            <div className="flex items-center space-x-2">
              <RiCalendarLine className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Đã đồng bộ Google Calendar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCard;
