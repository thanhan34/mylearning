'use client';

import { useState, useEffect } from 'react';
import UnassignedStudentsList from './components/UnassignedStudentsList';
import InlineStudentSubmissions from './components/InlineStudentSubmissions';
import WeeklyHomeworkTable from './components/WeeklyHomeworkTable';
import { useSession } from 'next-auth/react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  getTeacherClasses,
  removeStudentFromClass,
  addStudentToClass,
  createClass
} from '@/app/firebase/services/class';
import type { Class, ClassStudent } from '@/app/firebase/services/types';
import AssignmentForm from '../components/AssignmentForm';
import { Assignment } from '@/types/assignment';

interface Student {
  id: string;
  email: string;
  name: string;
}

export default function ClassManagement() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [showNewClassForm, setShowNewClassForm] = useState(false);
  const [showUnassignedList, setShowUnassignedList] = useState(false); 
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      getTeacherClasses(session.user.email).then(setClasses);
    }
  }, [session]);

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !session?.user?.email) return;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', session.user.email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return;
      
      const teacherId = querySnapshot.docs[0].id;
      const classId = await createClass({
        name: newClassName,
        teacherId: teacherId,
        description: '', // Add required fields
        schedule: '',
        studentCount: 0,
        students: [],
        createdAt: new Date().toISOString(),
        announcements: []
      });

      if (classId) {
        const teacherClasses = await getTeacherClasses(session.user.email);
        setClasses(teacherClasses);
        setNewClassName('');
        setShowNewClassForm(false);
      }
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass || !session?.user?.email) return;

    try {
      const success = await removeStudentFromClass(selectedClass.id, studentId);
      if (success) {
        const teacherClasses = await getTeacherClasses(session.user.email);
        setClasses(teacherClasses);
        const updatedClass = teacherClasses.find((c: Class) => c.id === selectedClass.id);
        if (updatedClass) {
          setSelectedClass(updatedClass);
        }
      }
    } catch (error) {
      console.error('Error removing student:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#fc5d01]">Quản lý lớp học</h1>
        <button
          onClick={() => setShowNewClassForm(true)}
          className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
        >
          Thêm lớp học
        </button>
      </div>

      {showNewClassForm && (
        <div className="mb-6 p-4 bg-[#fedac2] rounded-lg">
          <h3 className="font-semibold mb-2">Thêm lớp học mới</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Nhập tên lớp học..."
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleCreateClass}
              className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
            >
              Thêm
            </button>
            <button
              onClick={() => setShowNewClassForm(false)}
              className="px-4 py-2 rounded border border-[#fc5d01] text-[#fc5d01] hover:bg-[#fedac2]"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Class List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {classes.map(cls => (
          <div 
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              selectedClass?.id === cls.id 
                ? 'bg-[#fc5d01] text-white' 
                : 'bg-[#6D6875] hover:bg-[#fdbc94]'
            }`}
          >
            <h3 className="font-semibold">{cls.name}</h3>
            <p>Học viên: {cls.students.length}</p>
          </div>
        ))}
      </div>

      {/* Selected Class Management */}
      {selectedClass && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#fc5d01]">
              Quản lý lớp {selectedClass.name}
            </h2>
            <div className="space-x-2">
              <button
                onClick={() => setShowUnassignedList(true)}
                className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
              >
                Thêm học viên
              </button>
            </div>
          </div>

          {/* Weekly Homework Table */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-black">Bảng nộp bài tập tuần này</h3>
            <WeeklyHomeworkTable 
              classId={selectedClass.id}
              students={selectedClass.students}
              onStudentSelect={(student) => setSelectedStudent(student)}
              onRemoveStudent={handleRemoveStudent}
            />
          </div>

          {/* Student Submissions Section */}
          {selectedStudent && (
            <InlineStudentSubmissions student={selectedStudent} />
          )}
        </div>
      )}

      {/* Unassigned Students Modal */}
      {showUnassignedList && selectedClass && (
        <UnassignedStudentsList
          onSelect={async (student) => {
            try {
              await addStudentToClass(selectedClass.id, {
                id: student.id,
                name: student.name,
                email: student.email,                  
              }, selectedClass.teacherId);
              
              if (session?.user?.email) {
                const teacherClasses = await getTeacherClasses(session.user.email);
                setClasses(teacherClasses);
                const updatedClass = teacherClasses.find((c: Class) => c.id === selectedClass.id);
                if (updatedClass) {
                  setSelectedClass(updatedClass);
                }
              }
              setShowUnassignedList(false);
            } catch (error) {
              console.error('Error adding student:', error);
            }
          }}
          onClose={() => setShowUnassignedList(false)}
        />
      )}
    </div>
  );
}
