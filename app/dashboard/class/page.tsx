'use client';

import { useState, useEffect } from 'react';
import UnassignedStudentsList from './components/UnassignedStudentsList';
import InlineStudentSubmissions from './components/InlineStudentSubmissions';
import { useSession } from 'next-auth/react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Class, 
  ClassStudent,
  getTeacherClasses,
  removeStudentFromClass,
  addStudentToClass,
  createClass
} from '../../firebase/services';
import AssignmentForm from '../components/AssignmentForm';
import { Assignment } from '@/types/assignment';

export default function ClassManagement() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [showNewClassForm, setShowNewClassForm] = useState(false);
  const [showUnassignedList, setShowUnassignedList] = useState(false); 
  const [selectedStudent, setSelectedStudent] = useState<{id: string; email: string; name: string} | null>(null);

 

 

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !session?.user?.email) return;

    // Get teacher's document ID first
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', session.user.email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;
    
    const teacherId = querySnapshot.docs[0].id;
    const classId = await createClass({
      name: newClassName,
      teacherId: teacherId,
      students: [],
      announcements: []
    });

    if (classId) {
      const teacherClasses = await getTeacherClasses(teacherId);
      setClasses(teacherClasses);
      setNewClassName('');
      setShowNewClassForm(false);
    }
  };

  useEffect(() => {
    const loadClasses = async () => {
      if (session?.user?.email) {
        // Get teacher's document ID first
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', session.user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const teacherId = querySnapshot.docs[0].id;
          const teacherClasses = await getTeacherClasses(teacherId);
          setClasses(teacherClasses);
        }
      }
    };
    loadClasses();
  }, [session]);

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass || !session?.user?.email) return;

    const success = await removeStudentFromClass(selectedClass.id, studentId);
    if (success) {
      // Get teacher's document ID and refresh class data
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', session.user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const teacherId = querySnapshot.docs[0].id;
        const teacherClasses = await getTeacherClasses(teacherId);
        setClasses(teacherClasses);
        const updatedClass = teacherClasses.find((c: Class) => c.id === selectedClass.id);
        if (updatedClass) {
          setSelectedClass(updatedClass);
        }
      }
    }
  };



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#fc5d01]">Class Management</h1>
        <button
          onClick={() => setShowNewClassForm(true)}
          className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
        >
          Create New Class
        </button>
      </div>

      {/* New Class Form */}
      {showNewClassForm && (
        <div className="mb-6 p-4 bg-[#fedac2] rounded-lg">
          <h3 className="font-semibold mb-2">Create New Class</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Enter class name..."
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleCreateClass}
              className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewClassForm(false)}
              className="px-4 py-2 rounded border border-[#fc5d01] text-[#fc5d01] hover:bg-[#fedac2]"
            >
              Cancel
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
            <p>Students: {cls.students.length}</p>
            
          </div>
        ))}
      </div>

      {/* Selected Class Management */}
      {selectedClass && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#fc5d01]">
              {selectedClass.name} Management
            </h2>
            <div className="space-x-2">
              <button
                onClick={() => setShowUnassignedList(true)}
                className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
              >
                Add Student
              </button>              
            </div>
          </div>

       

          {/* Unassigned Students List */}
          {showUnassignedList && selectedClass && (
            <UnassignedStudentsList
              onSelect={async (student) => {
                await addStudentToClass(selectedClass.id, {
                  id: student.id,
                  name: student.name,
                  email: student.email,                  
                }, selectedClass.teacherId);
                
                // Get teacher's document ID first
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', session?.user?.email));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  const teacherId = querySnapshot.docs[0].id;
                  const teacherClasses = await getTeacherClasses(teacherId);
                  setClasses(teacherClasses);
                  const updatedClass = teacherClasses.find((c: Class) => c.id === selectedClass.id);
                  if (updatedClass) {
                    setSelectedClass(updatedClass);
                  }
                }
                setShowUnassignedList(false);
              }}
              onClose={() => setShowUnassignedList(false)}
            />
          )}

          {/* Student List */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-black">Students</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#fc5d01] text-white">
                  <tr>
                    <th className="p-2 text-left">Name</th>                    
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.students.map(student => (
                    <tr 
                      key={student.id} 
                      className="border-b text-black hover:bg-[#fedac2] cursor-pointer"
                      onClick={(e) => {
                        // Don't show submissions when clicking on select or remove button
                        if (
                          (e.target as HTMLElement).tagName === 'SELECT' ||
                          (e.target as HTMLElement).tagName === 'BUTTON'
                        ) {
                          return;
                        }
                        setSelectedStudent({
                          id: student.id,
                          email: student.email,
                          name: student.name
                        });
                      }}
                    >
                      <td className="p-2">{student.name}</td>                    
                      <td className="p-2">
                        <button 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        

          {/* Student Submissions Section */}
          {selectedStudent && (
            <InlineStudentSubmissions student={selectedStudent} />
          )}
        </div>
      )}
    </div>
  );
}
