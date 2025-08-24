"use client";

import React from 'react';
import { Schedule } from '../../../types/schedule';
import { renderTextWithLinks } from '../../utils/linkUtils';
import { 
  RiCalendarLine, 
  RiTimeLine, 
  RiMapPinLine, 
  RiFileTextLine,
  RiTeamLine,
  RiUserLine,
  RiCloseLine,
  RiEditLine,
  RiDeleteBinLine
} from 'react-icons/ri';

interface ScheduleDetailModalProps {
  schedule: Schedule;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (scheduleId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false
}) => {
  if (!isOpen) return null;

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('vi-VN', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
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
      case 'class': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam': return 'bg-red-100 text-red-800 border-red-200';
      case 'meeting': return 'bg-green-100 text-green-800 border-green-200';
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h2 className="text-2xl font-bold text-[#fc5d01]">
                  {schedule.title}
                </h2>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(schedule.type)}`}>
                    {getTypeLabel(schedule.type)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(schedule.status)}`}>
                    {getStatusLabel(schedule.status)}
                  </span>
                </div>
              </div>
              
              {/* Time Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  isPast ? 'bg-gray-400' : isUpcoming ? 'bg-green-400' : 'bg-yellow-400'
                }`} />
                <span className="text-sm font-medium text-gray-600">
                  {isPast ? 'Đã kết thúc' : isUpcoming ? 'Sắp diễn ra' : 'Đang diễn ra'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {canEdit && onEdit && (
                <button
                  onClick={() => {
                    onEdit(schedule);
                    onClose();
                  }}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                  title="Chỉnh sửa"
                >
                  <RiEditLine className="w-5 h-5" />
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={() => {
                    onDelete(schedule.id);
                    onClose();
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                  title="Xóa"
                >
                  <RiDeleteBinLine className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300"
                title="Đóng"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {schedule.description && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <RiFileTextLine className="w-5 h-5 text-[#fc5d01]" />
                <h3 className="font-semibold text-gray-800">Mô tả</h3>
              </div>
              <div className="text-gray-700 leading-relaxed">
                {renderTextWithLinks(schedule.description)}
              </div>
            </div>
          )}

          {/* Time Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#fedac2] bg-opacity-30 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-[#fc5d01] rounded-lg">
                  <RiTimeLine className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Thời gian bắt đầu</h3>
              </div>
              <p className="text-gray-700 font-medium">{startDateTime.date}</p>
              <p className="text-[#fc5d01] font-bold text-lg">{startDateTime.time}</p>
            </div>

            <div className="bg-[#fedac2] bg-opacity-30 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-[#fc5d01] rounded-lg">
                  <RiTimeLine className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Thời gian kết thúc</h3>
              </div>
              <p className="text-gray-700 font-medium">{endDateTime.date}</p>
              <p className="text-[#fc5d01] font-bold text-lg">{endDateTime.time}</p>
            </div>
          </div>

          {/* Location */}
          {schedule.location && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-[#fc5d01] rounded-lg">
                  <RiMapPinLine className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Địa điểm</h3>
              </div>
              <p className="text-gray-700 font-medium">{schedule.location}</p>
            </div>
          )}

          {/* Participants Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schedule.classIds && schedule.classIds.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <RiTeamLine className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">{schedule.classIds.length}</p>
                <p className="text-sm text-blue-700 font-medium">Lớp học</p>
              </div>
            )}

            {schedule.teacherIds && schedule.teacherIds.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-3 bg-green-500 rounded-full">
                    <RiUserLine className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">{schedule.teacherIds.length}</p>
                <p className="text-sm text-green-700 font-medium">Giáo viên</p>
              </div>
            )}

            {schedule.studentIds && schedule.studentIds.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-3 bg-purple-500 rounded-full">
                    <RiUserLine className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-600">{schedule.studentIds.length}</p>
                <p className="text-sm text-purple-700 font-medium">Học viên</p>
              </div>
            )}
          </div>

          {/* Google Calendar Integration */}
          {schedule.googleEventId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <RiCalendarLine className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Đã đồng bộ với Google Calendar</p>
                  <p className="text-sm text-green-600">Lịch học này đã được tự động thêm vào Google Calendar của bạn</p>
                </div>
              </div>
            </div>
          )}

          {/* Recurring Information */}
          {schedule.isRecurring && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <RiCalendarLine className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Lịch học định kỳ</p>
                  <p className="text-sm text-blue-600">Đây là một phần của chuỗi lịch học định kỳ</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailModal;
