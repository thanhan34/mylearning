'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PTE_CHECKLIST_ITEMS, 
  PTEChecklistProgress, 
  PTEChecklistItem 
} from '../../../types/pte-checklist';
import {
  createPTEChecklistProgress,
  subscribeToPTEChecklistProgress,
  updatePTEChecklistItem
} from '../../firebase/services/pte-checklist';

interface ChecklistPTEProps {
  targetUserId?: string; // For admin/teacher to view specific student
  isReadOnly?: boolean;
}

const ChecklistPTE: React.FC<ChecklistPTEProps> = ({ 
  targetUserId, 
  isReadOnly = false 
}) => {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<PTEChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const userId = targetUserId || session?.user?.id || '';
  const userRole = session?.user?.role;
  const isStudent = userRole === 'student';
  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin' || userRole === 'assistant';

  // Group items by category
  const groupedItems = PTE_CHECKLIST_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PTEChecklistItem[]>);

  const categoryColors = {
    speaking: 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200',
    writing: 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200',
    reading: 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200',
    listening: 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
  };

  const categoryTitles = {
    speaking: '🗣️ Speaking',
    writing: '✍️ Writing',
    reading: '📖 Reading',
    listening: '👂 Listening'
  };

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToPTEChecklistProgress(userId, (progressData) => {
      setProgress(progressData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const initializeProgress = async () => {
      if (!userId || !session?.user?.name || !session?.user?.email) return;
      
      if (!progress && !loading) {
        const progressId = await createPTEChecklistProgress(
          userId,
          session.user.name,
          session.user.email
        );
        
        if (progressId) {
          // Progress will be updated via subscription
        }
      }
    };

    initializeProgress();
  }, [userId, session, progress, loading]);

  const handleCheckboxChange = async (
    itemId: string,
    field: 'studentCompleted' | 'teacherApproved',
    value: boolean
  ) => {
    if (isReadOnly || !session?.user?.id) return;

    // Permission check
    if (field === 'studentCompleted' && !isStudent) return;
    if (field === 'teacherApproved' && !isTeacherOrAdmin) return;

    setUpdating(itemId);

    const success = await updatePTEChecklistItem(
      userId,
      itemId,
      { [field]: value },
      session.user.id
    );

    if (!success) {
      console.error('Failed to update checklist item');
    }

    setUpdating(null);
  };

  const handleNotesChange = async (itemId: string, notes: string) => {
    if (isReadOnly || !isTeacherOrAdmin || !session?.user?.id) return;

    setUpdating(itemId);

    const success = await updatePTEChecklistItem(
      userId,
      itemId,
      { notes },
      session.user.id
    );

    if (!success) {
      console.error('Failed to update checklist notes');
    }

    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Đang tải checklist...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          📋 Checklist 20 Phần Thi PTE
        </h1>
        {progress && (
          <p className="text-gray-600">
            Học viên: <span className="font-semibold text-orange-600">{progress.userName}</span>
          </p>
        )}
      </div>

      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className={`mb-8 rounded-lg border-2 ${categoryColors[category as keyof typeof categoryColors]} p-6`}>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {categoryTitles[category as keyof typeof categoryTitles]}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-200">
                  <th className="text-left p-4 font-semibold text-gray-700 min-w-[200px]">
                    Phần thi
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700 w-32">
                    ✅ Học viên đã học
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700 w-32">
                    ✅ Giáo viên đánh giá
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-700 min-w-[200px]">
                    📝 Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemProgress = progress?.items[item.id] || {
                    studentCompleted: false,
                    teacherApproved: false,
                    notes: ''
                  };

                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-orange-25 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                            {item.order}
                          </span>
                          <span className="font-medium text-gray-800">{item.name}</span>
                        </div>
                      </td>
                      
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={itemProgress.studentCompleted}
                          onChange={(e) => handleCheckboxChange(item.id, 'studentCompleted', e.target.checked)}
                          disabled={isReadOnly || !isStudent || updating === item.id}
                          className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                      
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={itemProgress.teacherApproved}
                          onChange={(e) => handleCheckboxChange(item.id, 'teacherApproved', e.target.checked)}
                          disabled={isReadOnly || !isTeacherOrAdmin || updating === item.id}
                          className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                      
                      <td className="p-4">
                        <textarea
                          value={itemProgress.notes}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          disabled={isReadOnly || !isTeacherOrAdmin || updating === item.id}
                          placeholder="Thêm ghi chú..."
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 resize-none"
                          rows={2}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Progress Summary */}
      {progress && (
        <div className="mt-8 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Tổng quan tiến độ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(progress.items).filter(item => item.studentCompleted).length}/{PTE_CHECKLIST_ITEMS.length}
              </div>
              <div className="text-sm text-gray-600">Học viên đã hoàn thành</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(progress.items).filter(item => item.teacherApproved).length}/{PTE_CHECKLIST_ITEMS.length}
              </div>
              <div className="text-sm text-gray-600">Giáo viên đã duyệt</div>
            </div>
          </div>
        </div>
      )}

      {updating && (
        <div className="fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Đang cập nhật...
        </div>
      )}
    </div>
  );
};

export default ChecklistPTE;
