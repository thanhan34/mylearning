'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/config';

interface Class {
  id: string;
  name: string;
  teacherName?: string;
  studentCount: number;
}

interface Props {
  studentName: string;
  currentClassId: string;
  currentClassName: string;
  onMove: (targetClassId: string, targetClassName: string) => void;
  onClose: () => void;
}

export default function MoveStudentModal({ 
  studentName, 
  currentClassId, 
  currentClassName,
  onMove, 
  onClose 
}: Props) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesRef = collection(db, 'classes');
        const snapshot = await getDocs(classesRef);
        
        const classesData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              teacherName: data.teacherName,
              studentCount: data.students?.length || 0
            };
          })
          // Filter out the current class and completed classes
          .filter(cls => cls.id !== currentClassId);
        
        setClasses(classesData);
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [currentClassId]);

  const handleMove = () => {
    if (selectedClassId) {
      const targetClass = classes.find(c => c.id === selectedClassId);
      if (targetClass) {
        onMove(selectedClassId, targetClass.name);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#fc5d01]">
            Di chuyển học viên
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Học viên: <span className="font-medium text-black">{studentName}</span>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Lớp hiện tại: <span className="font-medium text-black">{currentClassName}</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="target-class" className="block text-sm font-medium text-gray-700 mb-1">
                Chọn lớp đích
              </label>
              <select
                id="target-class"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent text-black"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.studentCount} học viên)
                  </option>
                ))}
              </select>
            </div>

            {classes.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Không có lớp nào khác để di chuyển
              </p>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-black"
              >
                Hủy
              </button>
              <button
                onClick={handleMove}
                disabled={!selectedClassId}
                className={`px-4 py-2 rounded-lg ${
                  selectedClassId
                    ? 'bg-[#fc5d01] text-white hover:bg-[#fd7f33]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Di chuyển
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
