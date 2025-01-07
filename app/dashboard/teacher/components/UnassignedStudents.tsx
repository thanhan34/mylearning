'use client';

import { useState, useEffect } from 'react';
import { User } from '../../../../types/admin';
import { db } from '../../../../app/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useSession } from 'next-auth/react';

const UnassignedStudents = () => {
  const { data: session } = useSession();
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [teacherId, setTeacherId] = useState<string>('');

  useEffect(() => {
    if (session?.user?.email) {
      fetchTeacherAndUnassignedStudents();
    }
  }, [session]);

  const fetchTeacherAndUnassignedStudents = async () => {
    try {
      // First get the teacher's document
      const teachersQuery = query(
        collection(db, 'users'),
        where('email', '==', session?.user?.email)
      );
      const teacherSnapshot = await getDocs(teachersQuery);
      if (!teacherSnapshot.empty) {
        const teacherDoc = teacherSnapshot.docs[0];
        setTeacherId(teacherDoc.id);

        // Get unassigned students
        const unassignedStudentsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          where('teacherId', '==', null)
        );
        const unassignedStudentsSnapshot = await getDocs(unassignedStudentsQuery);
        const unassignedStudentsData = unassignedStudentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        setUnassignedStudents(unassignedStudentsData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAssignStudent = async (student: User) => {
    try {
      // Update student document with teacher ID
      const studentRef = doc(db, 'users', student.id);
      await updateDoc(studentRef, {
        teacherId: teacherId,
        assignedAt: new Date().toISOString()
      });

      // Update teacher's assignedStudents array
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        assignedStudents: arrayUnion(student.id),
        updatedAt: new Date().toISOString()
      });

      // Refresh the list
      await fetchTeacherAndUnassignedStudents();
    } catch (error) {
      console.error('Error assigning student:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[#fc5d01] mb-6">Danh sách học viên chưa có giáo viên</h2>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="space-y-2">
          {unassignedStudents.map((student) => (
            <div
              key={student.id}
              className="p-3 rounded-lg border border-[#fedac2] hover:border-[#fc5d01] transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-black">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                <button
                  onClick={() => handleAssignStudent(student)}
                  className="px-3 py-1 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          ))}
          {unassignedStudents.length === 0 && (
            <p className="text-gray-500 text-center">Không có học viên nào chưa được assign</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnassignedStudents;
