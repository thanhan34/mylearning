"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Schedule, CreateScheduleData } from '../../../types/schedule';
import { Class } from '../../firebase/services/types';
import { User } from '../../firebase/services/user';
import { 
  getSchedulesByUser,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  checkSchedulePermission
} from '../../firebase/services/schedule';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScheduleCard from './ScheduleCard';
import ScheduleForm from './ScheduleForm';
import CalendarView from './CalendarView';
import ConfirmDialog from '../../components/ConfirmDialog';
import SuccessNotification from '../../components/SuccessNotification';
import { 
  RiCalendarLine, 
  RiSearchLine,
  RiFilterLine,
  RiAddLine,
  RiGridLine,
  RiCalendar2Line
} from 'react-icons/ri';

const TeacherScheduleView: React.FC = () => {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [canCreateSchedule, setCanCreateSchedule] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; scheduleId: string }>({
    show: false,
    scheduleId: ''
  });
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (session?.user?.email) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const userEmail = session?.user?.email;
      const userRole = session?.user?.role;
      let userId = session?.user?.id;
      
      console.log('TeacherScheduleView - Loading data for:', { userEmail, userRole, userId });
      
      // Fallback: if userId is not available, use sanitized email
      if (!userId && userEmail) {
        userId = userEmail.replace(/[.#$[\]]/g, '_');
        console.log('TeacherScheduleView - Using fallback userId:', userId);
      }
      
      if (userId && userRole) {
        // Load schedules using userId
        console.log('TeacherScheduleView - Calling getSchedulesByUser with:', userId, userRole);
        const schedulesData = await getSchedulesByUser(userId, userRole);
        console.log('TeacherScheduleView - Received schedules:', schedulesData);
        setSchedules(schedulesData);

        // Check if user can create schedules
        const hasPermission = await checkSchedulePermission(userId);
        setCanCreateSchedule(hasPermission);

        // Load classes and users for form
        const classesSnapshot = await getDocs(collection(db, 'classes'));
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Class));
        setAvailableClasses(classesData);

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        setAvailableUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleCreateSchedule = async (data: CreateScheduleData): Promise<boolean> => {
    try {
      let userId = session?.user?.id;
      const userEmail = session?.user?.email;
      
      // Fallback: if userId is not available, use sanitized email
      if (!userId && userEmail) {
        userId = userEmail.replace(/[.#$[\]]/g, '_');
      }
      
      if (!userId) return false;

      const scheduleId = await createSchedule(data, userId);
      
      if (scheduleId) {
        showNotification('Tạo lịch học thành công!', 'success');
        setShowForm(false);
        await loadData();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating schedule:', error);
      showNotification('Lỗi khi tạo lịch học', 'error');
      return false;
    }
  };

  const handleUpdateSchedule = async (data: CreateScheduleData): Promise<boolean> => {
    try {
      if (!editingSchedule) return false;

      const success = await updateSchedule(editingSchedule.id, data);
      
      if (success) {
        showNotification('Cập nhật lịch học thành công!', 'success');
        setShowForm(false);
        setEditingSchedule(undefined);
        await loadData();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating schedule:', error);
      showNotification('Lỗi khi cập nhật lịch học', 'error');
      return false;
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    setDeleteConfirm({ show: true, scheduleId });
  };

  const confirmDelete = async () => {
    try {
      const success = await deleteSchedule(deleteConfirm.scheduleId);
      
      if (success) {
        showNotification('Xóa lịch học thành công!', 'success');
        await loadData();
      } else {
        showNotification('Lỗi khi xóa lịch học', 'error');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showNotification('Lỗi khi xóa lịch học', 'error');
    } finally {
      setDeleteConfirm({ show: false, scheduleId: '' });
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
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

  if (showForm) {
    return (
      <ScheduleForm
        schedule={editingSchedule}
        onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
        onCancel={() => {
          setShowForm(false);
          setEditingSchedule(undefined);
        }}
        availableClasses={availableClasses}
        availableUsers={availableUsers}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#fc5d01] flex items-center space-x-3">
          <RiCalendarLine className="w-8 h-8" />
          <span>Lịch học</span>
        </h1>
        <div className="flex items-center space-x-4">
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
          
          {canCreateSchedule && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white rounded-xl hover:from-[#fd7f33] hover:to-[#fc5d01] transition-all duration-300 flex items-center space-x-2"
            >
              <RiAddLine className="w-5 h-5" />
              <span>Tạo lịch mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission Notice */}
      {!canCreateSchedule && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Lưu ý:</strong> Bạn chưa có quyền tạo lịch học. Vui lòng liên hệ admin để được cấp quyền.
          </p>
        </div>
      )}

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
        <CalendarView 
          schedules={schedules} 
          onScheduleClick={(schedule) => {
            if (canCreateSchedule) {
              handleEditSchedule(schedule);
            }
          }}
        />
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
                    onEdit={canCreateSchedule ? handleEditSchedule : undefined}
                    onDelete={canCreateSchedule ? handleDeleteSchedule : undefined}
                    canEdit={canCreateSchedule}
                    canDelete={canCreateSchedule}
                    showActions={canCreateSchedule}
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
                    onEdit={canCreateSchedule ? handleEditSchedule : undefined}
                    onDelete={canCreateSchedule ? handleDeleteSchedule : undefined}
                    canEdit={canCreateSchedule}
                    canDelete={canCreateSchedule}
                    showActions={canCreateSchedule}
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
                    onEdit={canCreateSchedule ? handleEditSchedule : undefined}
                    onDelete={canCreateSchedule ? handleDeleteSchedule : undefined}
                    canEdit={canCreateSchedule}
                    canDelete={canCreateSchedule}
                    showActions={canCreateSchedule}
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
                {canCreateSchedule 
                  ? 'Bạn có thể tạo lịch học mới bằng cách nhấn nút "Tạo lịch mới"'
                  : 'Lịch học sẽ được hiển thị khi có lịch được tạo cho các lớp bạn phụ trách'
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <ConfirmDialog
          title="Xác nhận xóa lịch học"
          message="Bạn có chắc chắn muốn xóa lịch học này? Hành động này không thể hoàn tác."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ show: false, scheduleId: '' })}
          confirmText="Xóa"
          cancelText="Hủy"
        />
      )}

      {/* Success/Error Notification */}
      {notification.show && (
        <SuccessNotification
          message={notification.message}
          onClose={() => setNotification({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default TeacherScheduleView;
