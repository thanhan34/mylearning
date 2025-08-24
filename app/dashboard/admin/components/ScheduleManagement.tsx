"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Schedule, CreateScheduleData, SchedulePermission } from '../../../../types/schedule';
import { Class } from '../../../firebase/services/types';
import { User } from '../../../firebase/services/user';
import { 
  createSchedule, 
  updateSchedule, 
  deleteSchedule, 
  getSchedulesByUser,
  getSchedulePermissions,
  grantSchedulePermission,
  revokeSchedulePermission
} from '../../../firebase/services/schedule';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import ScheduleForm from '../../components/ScheduleForm';
import ScheduleCard from '../../components/ScheduleCard';
import CalendarView from '../../components/CalendarView';
import ConfirmDialog from '../../../components/ConfirmDialog';
import SuccessNotification from '../../../components/SuccessNotification';
import { 
  RiCalendarLine, 
  RiAddLine, 
  RiSearchLine,
  RiFilterLine,
  RiUserAddLine,
  RiSettings4Line,
  RiGridLine,
  RiCalendar2Line
} from 'react-icons/ri';

const ScheduleManagement: React.FC = () => {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [permissions, setPermissions] = useState<SchedulePermission[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
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
      
      // Load schedules
      const userEmail = session?.user?.email;
      if (userEmail) {
        const sanitizedEmail = userEmail.replace(/[.#$[\]]/g, '_');
        const schedulesData = await getSchedulesByUser(sanitizedEmail, 'admin');
        setSchedules(schedulesData);
      }

      // Load permissions
      const permissionsData = await getSchedulePermissions();
      setPermissions(permissionsData);

      // Load classes
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const classesData = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Class));
      setAvailableClasses(classesData);

      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setAvailableUsers(usersData);

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
      const userEmail = session?.user?.email;
      if (!userEmail) return false;

      const sanitizedEmail = userEmail.replace(/[.#$[\]]/g, '_');
      const scheduleId = await createSchedule(data, sanitizedEmail);
      
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

  const handleGrantPermission = async (userId: string) => {
    try {
      const userEmail = session?.user?.email;
      let adminUserId = session?.user?.id;
      
      if (!userEmail) return;

      // If adminUserId is not available, use sanitized email as fallback
      if (!adminUserId) {
        adminUserId = userEmail.replace(/[.#$[\]]/g, '_');
      }

      const success = await grantSchedulePermission(userId, adminUserId);
      
      if (success) {
        showNotification('Cấp quyền thành công!', 'success');
        await loadData();
      } else {
        showNotification('Lỗi khi cấp quyền', 'error');
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      showNotification('Lỗi khi cấp quyền', 'error');
    }
  };

  const handleRevokePermission = async (userId: string) => {
    try {
      const success = await revokeSchedulePermission(userId);
      
      if (success) {
        showNotification('Thu hồi quyền thành công!', 'success');
        await loadData();
      } else {
        showNotification('Lỗi khi thu hồi quyền', 'error');
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      showNotification('Lỗi khi thu hồi quyền', 'error');
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

  if (showPermissions) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#fc5d01] flex items-center space-x-2">
            <RiUserAddLine className="w-6 h-6" />
            <span>Quản lý quyền tạo lịch</span>
          </h2>
          <button
            onClick={() => setShowPermissions(false)}
            className="px-4 py-2 text-gray-600 hover:text-[#fc5d01] transition-all duration-300"
          >
            Quay lại
          </button>
        </div>

        {/* Grant Permission Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cấp quyền cho người dùng</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableUsers
              .filter(user => (user.role === 'teacher' || user.role === 'assistant') && !permissions.find(p => p.userId === user.id))
              .map(user => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{user.name || user.email}</p>
                      <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                    </div>
                    <button
                      onClick={() => handleGrantPermission(user.id)}
                      className="px-3 py-1 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] transition-all duration-300"
                    >
                      Cấp quyền
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Current Permissions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quyền hiện tại</h3>
          <div className="space-y-4">
            {permissions.map(permission => (
              <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{permission.userName}</p>
                    <p className="text-sm text-gray-600">{permission.userEmail}</p>
                    <p className="text-xs text-gray-500">
                      Cấp bởi: {permission.grantedByName} - {new Date(permission.grantedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokePermission(permission.userId)}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300"
                  >
                    Thu hồi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#fc5d01] flex items-center space-x-3">
          <RiCalendarLine className="w-8 h-8" />
          <span>Quản lý lịch học</span>
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
          
          <button
            onClick={() => setShowPermissions(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 flex items-center space-x-2"
          >
            <RiSettings4Line className="w-4 h-4" />
            <span>Quản lý quyền</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white rounded-xl hover:from-[#fd7f33] hover:to-[#fc5d01] transition-all duration-300 flex items-center space-x-2"
          >
            <RiAddLine className="w-5 h-5" />
            <span>Tạo lịch mới</span>
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
        <CalendarView 
          schedules={schedules} 
          onScheduleClick={handleEditSchedule}
        />
      ) : (
        <>
          {/* Schedules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSchedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={handleEditSchedule}
                onDelete={handleDeleteSchedule}
                canEdit={true}
                canDelete={true}
                showActions={true}
              />
            ))}
          </div>

          {filteredSchedules.length === 0 && (
            <div className="text-center py-12">
              <RiCalendarLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                  ? 'Không tìm thấy lịch học phù hợp' 
                  : 'Chưa có lịch học nào'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Bạn có thể tạo lịch học mới bằng cách nhấn nút "Tạo lịch mới"
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

export default ScheduleManagement;
