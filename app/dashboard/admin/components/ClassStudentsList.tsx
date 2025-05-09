'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { User } from '@/types/admin';
import { getClassById } from '@/app/firebase/services/class';

interface Props {
  onSelect: (student: User) => void;
  onClose: () => void;
}

export default function ClassStudentsList({ onSelect, onClose }: Props) {
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);

  // Load all classes
  useEffect(() => {
    const classesRef = collection(db, 'classes');
    
    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(classesRef);
        const classesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        
        setClasses(classesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Load students when a class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    setClassLoading(true);
    
    const fetchStudents = async () => {
      try {
        const classData = await getClassById(selectedClassId);
        
        if (classData && classData.students) {
          // Convert class students to User objects
          const studentUsers = classData.students.map(student => ({
            id: student.id,
            email: student.email,
            name: student.name,
            role: 'student' as const,
            classId: selectedClassId,
            createdAt: new Date().toISOString() // Add createdAt field required by User type
          }));
          
          setStudents(studentUsers);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching class students:', error);
      } finally {
        setClassLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClassId]);

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
          <h3 className="text-lg font-semibold text-[#fc5d01]">Add Students from Classes</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {/* Class selector */}
        <div className="mb-4">
          <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Class
          </label>
          <select
            id="class-select"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
          >
            <option value="">-- Select a class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Students list */}
        {classLoading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
          </div>
        ) : selectedClassId ? (
          students.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No students found in this class</p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
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
          )
        ) : (
          <p className="text-gray-500 text-center py-4">Please select a class to view students</p>
        )}
      </div>
    </div>
  );
}
