'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { User } from '@/types/admin';

interface Props {
  onSelect: (student: User) => void;
  onClose: () => void;
}

export default function UnassignedStudentsList({ onSelect, onClose }: Props) {
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentsRef = collection(db, 'users');
    const q = query(
      studentsRef,
      where('role', '==', 'student'),
      where('teacherId', 'in', ['', null])
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          name: data.name,
          role: data.role as 'student',
          createdAt: data.createdAt,
          teacherId: data.teacherId,
          classId: data.classId
        } as User;
      });
      
      setUnassignedStudents(students);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching unassigned students:', error);
      setLoading(false);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative z-60">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#fc5d01]">Unassigned Students</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {unassignedStudents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No unassigned students found</p>
        ) : (
          <div className="space-y-2">
            {unassignedStudents.map((student) => (
              <div
                key={student.id}
                className="p-3 border border-[#fedac2] rounded-lg hover:border-[#fc5d01] cursor-pointer transition-colors"
                onClick={() => onSelect(student)}
              >
                <p className="font-medium text-black">{student.name}</p>
                <p className="text-sm text-gray-600">{student.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
