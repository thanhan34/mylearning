'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PTEChecklistProgress, PTE_CHECKLIST_ITEMS } from '../../../../types/pte-checklist';
import { 
  subscribeToAllPTEChecklistProgress, 
  subscribeToTeacherPTEChecklistProgress,
  subscribeToAssistantPTEChecklistProgress,
  getPTEChecklistStats 
} from '../../../firebase/services/pte-checklist';
import { initializeAllStudentChecklists } from '../../../firebase/services/pte-checklist-init';
import ChecklistPTE from '../../components/ChecklistPTE';

const PTEChecklistManagement: React.FC = () => {
  const { data: session } = useSession();
  const [allProgress, setAllProgress] = useState<PTEChecklistProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<PTEChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    completedItems: 0,
    approvedItems: 0,
    averageCompletion: 0,
    averageApproval: 0
  });

  const userRole = session?.user?.role;
  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher' || userRole === 'assistant';

  useEffect(() => {
    if (!isAdminOrTeacher || !session?.user?.id) return;

    let unsubscribe: () => void;

    if (userRole === 'admin') {
      // Admin xem tất cả học viên
      unsubscribe = subscribeToAllPTEChecklistProgress((progressList) => {
        setAllProgress(progressList);
        setLoading(false);
      });
    } else if (userRole === 'teacher') {
      // Teacher chỉ xem học viên mình phụ trách
      unsubscribe = subscribeToTeacherPTEChecklistProgress(session.user.id, (progressList) => {
        setAllProgress(progressList);
        setLoading(false);
      });
    } else if (userRole === 'assistant') {
      // Assistant xem học viên từ teachers/classes được gán
      unsubscribe = subscribeToAssistantPTEChecklistProgress(session.user.id, (progressList) => {
        setAllProgress(progressList);
        setLoading(false);
      });
    } else {
      setLoading(false);
      return;
    }

    return () => unsubscribe();
  }, [isAdminOrTeacher, userRole, session?.user?.id]);

  useEffect(() => {
    const calculateStats = () => {
      if (allProgress.length === 0) {
        setStats({
          totalStudents: 0,
          completedItems: 0,
          approvedItems: 0,
          averageCompletion: 0,
          averageApproval: 0
        });
        return;
      }

      let totalCompleted = 0;
      let totalApproved = 0;
      const totalPossibleItems = allProgress.length * PTE_CHECKLIST_ITEMS.length;

      allProgress.forEach(progress => {
        Object.values(progress.items).forEach(item => {
          if (item.studentCompleted) totalCompleted++;
          if (item.teacherApproved) totalApproved++;
        });
      });

      setStats({
        totalStudents: allProgress.length,
        completedItems: totalCompleted,
        approvedItems: totalApproved,
        averageCompletion: totalPossibleItems > 0 ? (totalCompleted / totalPossibleItems) * 100 : 0,
        averageApproval: totalPossibleItems > 0 ? (totalApproved / totalPossibleItems) * 100 : 0
      });
    };

    if (!loading) {
      calculateStats();
    }
  }, [loading, allProgress]);

  const getProgressPercentage = (progress: PTEChecklistProgress, type: 'student' | 'teacher') => {
    const completed = Object.values(progress.items).filter(item => 
      type === 'student' ? item.studentCompleted : item.teacherApproved
    ).length;
    return Math.round((completed / PTE_CHECKLIST_ITEMS.length) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const handleInitializeAllChecklists = async () => {
    if (initializing) return;
    
    setInitializing(true);
    try {
      const result = await initializeAllStudentChecklists();
      
      if (result.success) {
        alert(`Khởi tạo thành công!\n- Đã tạo: ${result.created} checklist\n- Đã tồn tại: ${result.existing} checklist\n- Lỗi: ${result.errors} checklist`);
      } else {
        alert('Có lỗi xảy ra khi khởi tạo checklist!');
      }
    } catch (error) {
      console.error('Error initializing checklists:', error);
      alert('Có lỗi xảy ra khi khởi tạo checklist!');
    } finally {
      setInitializing(false);
    }
  };

  if (!isAdminOrTeacher) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => setSelectedStudent(null)}
            className="flex items-center text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Quay lại danh sách
          </button>
        </div>
        <ChecklistPTE 
          targetUserId={selectedStudent.userId}
          isReadOnly={false}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📋 Quản lý PTE Checklist
          </h1>
          <p className="text-gray-600">
            {userRole === 'admin' 
              ? 'Theo dõi tiến độ học tập của tất cả học viên'
              : userRole === 'teacher'
              ? 'Theo dõi tiến độ học tập của học viên bạn phụ trách'
              : 'Theo dõi tiến độ học tập của học viên được gán'
            }
          </p>
        </div>
        <button
          onClick={handleInitializeAllChecklists}
          disabled={initializing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          {initializing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Đang khởi tạo...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Khởi tạo checklist cho tất cả học viên</span>
            </>
          )}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{stats.totalStudents}</div>
          <div className="text-sm text-gray-600">Tổng học viên</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-200">
          <div className="text-2xl font-bold text-blue-600">{stats.completedItems}</div>
          <div className="text-sm text-gray-600">Phần đã hoàn thành</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-200">
          <div className="text-2xl font-bold text-green-600">{stats.approvedItems}</div>
          <div className="text-sm text-gray-600">Phần đã duyệt</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-200">
          <div className="text-2xl font-bold text-purple-600">{stats.averageCompletion.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">TB hoàn thành</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-200">
          <div className="text-2xl font-bold text-indigo-600">{stats.averageApproval.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">TB được duyệt</div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-sm border border-orange-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Danh sách học viên</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : allProgress.length === 0 ? (
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Chưa có dữ liệu PTE Checklist
              </h3>
              <p className="text-gray-600 mb-6">
                Chưa có học viên nào sử dụng PTE Checklist. Bạn có thể:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Tạo checklist cho chính giáo viên
                    if (session?.user?.id) {
                      setSelectedStudent({
                        userId: session.user.id,
                        userName: session.user.name || 'Teacher',
                        userEmail: session.user.email || '',
                        items: {},
                        createdAt: new Date() as any,
                        updatedAt: new Date() as any
                      });
                    }
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  📝 Xem/Tạo checklist của tôi
                </button>
                <button
                  onClick={handleInitializeAllChecklists}
                  disabled={initializing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {initializing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Khởi tạo checklist cho tất cả học viên</span>
                    </>
                  )}
                </button>
                <div className="text-sm text-gray-500">
                  Hoặc hướng dẫn học viên truy cập trang PTE Checklist để tự tạo
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-700">Học viên</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Email</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Tiến độ học viên</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Tiến độ giáo viên</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Cập nhật cuối</th>
                  <th className="text-center p-4 font-semibold text-gray-700">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {allProgress.map((progress) => {
                  const studentProgress = getProgressPercentage(progress, 'student');
                  const teacherProgress = getProgressPercentage(progress, 'teacher');
                  
                  return (
                    <tr key={progress.id} className="border-b border-gray-100 hover:bg-orange-25 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{progress.userName}</div>
                      </td>
                      <td className="p-4 text-center text-sm text-gray-600">
                        {progress.userEmail}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getProgressColor(studentProgress)}`}>
                          {studentProgress}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getProgressColor(teacherProgress)}`}>
                          {teacherProgress}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm text-gray-600">
                        {progress.updatedAt?.toDate().toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedStudent(progress)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PTEChecklistManagement;
