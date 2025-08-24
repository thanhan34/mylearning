"use client";

import React, { useState, useEffect } from 'react';
import { CreateScheduleData, Schedule } from '../../../types/schedule';
import { Class } from '../../firebase/services/types';
import { User } from '../../firebase/services/user';
import { 
  RiCalendarLine, 
  RiTimeLine, 
  RiMapPinLine, 
  RiFileTextLine,
  RiSaveLine,
  RiCloseLine,
  RiTeamLine,
  RiUserLine,
  RiRepeatLine,
  RiCalendarEventLine
} from 'react-icons/ri';

interface ScheduleFormProps {
  schedule?: Schedule;
  onSubmit: (data: CreateScheduleData) => Promise<boolean>;
  onCancel: () => void;
  availableClasses: Class[];
  availableUsers: User[];
  isLoading?: boolean;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  schedule,
  onSubmit,
  onCancel,
  availableClasses,
  availableUsers,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateScheduleData>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    type: 'class',
    classIds: [],
    studentIds: [],
    teacherIds: [],
    isRecurring: false,
    recurringPattern: {
      frequency: 'weekly',
      daysOfWeek: [],
      interval: 1,
      endDate: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (schedule) {
      setFormData({
        title: schedule.title,
        description: schedule.description || '',
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location || '',
        type: schedule.type,
        classIds: schedule.classIds || [],
        studentIds: schedule.studentIds || [],
        teacherIds: schedule.teacherIds || []
      });
    }
  }, [schedule]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Thời gian bắt đầu là bắt buộc';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Thời gian kết thúc là bắt buộc';
    }

    if (formData.startTime && formData.endTime) {
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      
      if (endDate <= startDate) {
        newErrors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await onSubmit(formData);
    if (success) {
      // Reset form if creating new schedule
      if (!schedule) {
        setFormData({
          title: '',
          description: '',
          startTime: '',
          endTime: '',
          location: '',
          type: 'class',
          classIds: [],
          studentIds: [],
          teacherIds: [],
          isRecurring: false,
          recurringPattern: {
            frequency: 'weekly',
            daysOfWeek: [],
            interval: 1,
            endDate: ''
          }
        });
      }
    }
  };

  const handleInputChange = (field: keyof CreateScheduleData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleMultiSelect = (field: 'classIds' | 'studentIds' | 'teacherIds', value: string) => {
    const currentValues = formData[field] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(id => id !== value)
      : [...currentValues, value];
    
    handleInputChange(field, newValues);
  };

  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const convertToISOString = (dateTimeLocal: string) => {
    if (!dateTimeLocal) return '';
    return new Date(dateTimeLocal).toISOString();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#fc5d01] flex items-center space-x-2">
          <RiCalendarLine className="w-6 h-6" />
          <span>{schedule ? 'Chỉnh sửa lịch học' : 'Tạo lịch học mới'}</span>
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-[#fc5d01] hover:bg-[#fedac2] rounded-lg transition-all duration-300"
        >
          <RiCloseLine className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nhập tiêu đề lịch học"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại lịch
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300"
            >
              <option value="class">Lớp học</option>
              <option value="exam">Thi cử</option>
              <option value="meeting">Họp</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <RiTimeLine className="w-4 h-4" />
              <span>Thời gian bắt đầu *</span>
            </label>
            <input
              type="datetime-local"
              value={formatDateTimeLocal(formData.startTime)}
              onChange={(e) => handleInputChange('startTime', convertToISOString(e.target.value))}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300 ${
                errors.startTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startTime && (
              <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <RiTimeLine className="w-4 h-4" />
              <span>Thời gian kết thúc *</span>
            </label>
            <input
              type="datetime-local"
              value={formatDateTimeLocal(formData.endTime)}
              onChange={(e) => handleInputChange('endTime', convertToISOString(e.target.value))}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300 ${
                errors.endTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
            <RiMapPinLine className="w-4 h-4" />
            <span>Địa điểm</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300"
            placeholder="Nhập địa điểm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
            <RiFileTextLine className="w-4 h-4" />
            <span>Mô tả</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01] transition-all duration-300"
            placeholder="Nhập mô tả chi tiết"
          />
        </div>

        {/* Recurring Schedule */}
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
          <div className="flex items-center space-x-2 mb-4">
            <RiRepeatLine className="w-5 h-5 text-[#fc5d01]" />
            <h3 className="text-lg font-semibold text-gray-800">Lịch định kỳ</h3>
          </div>
          
          <div className="space-y-4">
            {/* Enable Recurring */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring || false}
                onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                className="w-4 h-4 text-[#fc5d01] border-gray-300 rounded focus:ring-[#fedac2]"
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                Tạo lịch định kỳ (ví dụ: Thứ 2 và Thứ 4 hàng tuần)
              </label>
            </div>

            {/* Recurring Options */}
            {formData.isRecurring && (
              <div className="space-y-4 pl-7 border-l-2 border-[#fedac2]">
                {/* Days of Week Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn các ngày trong tuần *
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { value: 1, label: 'T2' },
                      { value: 2, label: 'T3' },
                      { value: 3, label: 'T4' },
                      { value: 4, label: 'T5' },
                      { value: 5, label: 'T6' },
                      { value: 6, label: 'T7' },
                      { value: 0, label: 'CN' }
                    ].map((day) => (
                      <label key={day.value} className="flex flex-col items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.recurringPattern?.daysOfWeek?.includes(day.value) || false}
                          onChange={(e) => {
                            const currentDays = formData.recurringPattern?.daysOfWeek || [];
                            const newDays = e.target.checked
                              ? [...currentDays, day.value]
                              : currentDays.filter(d => d !== day.value);
                            handleInputChange('recurringPattern', {
                              ...formData.recurringPattern,
                              daysOfWeek: newDays
                            });
                          }}
                          className="w-4 h-4 text-[#fc5d01] border-gray-300 rounded focus:ring-[#fedac2] mb-1"
                        />
                        <span className="text-xs text-gray-600">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Interval */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lặp lại mỗi
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={formData.recurringPattern?.interval || 1}
                        onChange={(e) => handleInputChange('recurringPattern', {
                          ...formData.recurringPattern,
                          interval: parseInt(e.target.value)
                        })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
                      />
                      <span className="text-sm text-gray-600">tuần</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kết thúc vào ngày
                    </label>
                    <input
                      type="date"
                      value={formData.recurringPattern?.endDate ? formData.recurringPattern.endDate.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('recurringPattern', {
                        ...formData.recurringPattern,
                        endDate: e.target.value ? new Date(e.target.value).toISOString() : ''
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
                    />
                  </div>
                </div>

                {/* Preview */}
                {formData.recurringPattern?.daysOfWeek && formData.recurringPattern.daysOfWeek.length > 0 && (
                  <div className="bg-[#fedac2] bg-opacity-30 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <RiCalendarEventLine className="w-4 h-4 text-[#fc5d01]" />
                      <span className="text-sm font-medium text-[#fc5d01]">Xem trước lịch định kỳ:</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Lịch sẽ lặp lại vào các ngày:{' '}
                      {formData.recurringPattern.daysOfWeek
                        .sort()
                        .map(day => {
                          const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                          return dayNames[day];
                        })
                        .join(', ')}{' '}
                      hàng tuần
                      {formData.recurringPattern.endDate && (
                        <> đến ngày {new Date(formData.recurringPattern.endDate).toLocaleDateString('vi-VN')}</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Classes Selection */}
        {availableClasses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <RiTeamLine className="w-4 h-4" />
              <span>Lớp học</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-4">
              {availableClasses.map((classItem) => (
                <label key={classItem.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.classIds?.includes(classItem.id) || false}
                    onChange={() => handleMultiSelect('classIds', classItem.id)}
                    className="w-4 h-4 text-[#fc5d01] border-gray-300 rounded focus:ring-[#fedac2]"
                  />
                  <span className="text-sm text-gray-700">{classItem.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Teachers Selection */}
        {availableUsers.filter(user => user.role === 'teacher' || user.role === 'assistant').length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <RiUserLine className="w-4 h-4" />
              <span>Giáo viên / Trợ giảng</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-4">
              {availableUsers
                .filter(user => user.role === 'teacher' || user.role === 'assistant')
                .map((user) => (
                  <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.teacherIds?.includes(user.id) || false}
                      onChange={() => handleMultiSelect('teacherIds', user.id)}
                      className="w-4 h-4 text-[#fc5d01] border-gray-300 rounded focus:ring-[#fedac2]"
                    />
                    <span className="text-sm text-gray-700">
                      {user.name || user.email} ({user.role === 'assistant' ? 'Trợ giảng' : 'Giáo viên'})
                    </span>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Students Selection */}
        {availableUsers.filter(user => user.role === 'student').length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <RiUserLine className="w-4 h-4" />
              <span>Học viên cụ thể</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-4">
              {availableUsers
                .filter(user => user.role === 'student')
                .map((user) => (
                  <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.studentIds?.includes(user.id) || false}
                      onChange={() => handleMultiSelect('studentIds', user.id)}
                      className="w-4 h-4 text-[#fc5d01] border-gray-300 rounded focus:ring-[#fedac2]"
                    />
                    <span className="text-sm text-gray-700">{user.name || user.email}</span>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300"
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white rounded-xl hover:from-[#fd7f33] hover:to-[#fc5d01] transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RiSaveLine className="w-5 h-5" />
            <span>{isLoading ? 'Đang lưu...' : (schedule ? 'Cập nhật' : 'Tạo lịch')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm;
