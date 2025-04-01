'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { User } from '@/types/admin';

interface Props {
  onSelect: (teacher: User) => void;
  onClose: () => void;
}

export default function TeachersList({ onSelect, onClose }: Props) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const teachersRef = collection(db, 'users');
        const q = query(
          teachersRef,
          where('role', '==', 'teacher')
        );
        
        const querySnapshot = await getDocs(q);
        const teachersList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email,
            name: data.name,
            role: data.role as 'teacher',
            createdAt: data.createdAt
          } as User;
        });
        
        setTeachers(teachersList);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 1000 }}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative" style={{ zIndex: 1001 }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#fc5d01]">Danh sách giáo viên</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {teachers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Không tìm thấy giáo viên</p>
        ) : (
          <div className="space-y-2">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="p-3 border border-[#fedac2] rounded-lg hover:border-[#fc5d01] cursor-pointer transition-colors"
                onClick={() => onSelect(teacher)}
              >
                <p className="font-medium text-black">{teacher.name}</p>
                <p className="text-sm text-gray-600">{teacher.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
