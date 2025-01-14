'use client';

import { useState, useEffect } from 'react';
import { Class, User } from '../../../../types/admin';
import { db } from '../../../firebase/config';
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, updateDoc, query, where } from 'firebase/firestore';
import InlineStudentSubmissions from '../../class/components/InlineStudentSubmissions';
import UnassignedStudentsList from '../../class/components/UnassignedStudentsList';
import TeachersList from './TeachersList';

interface Student {
  id: string;
  name: string;
  email: string;
  classId?: string;
  avatar?: string;
  target?: string;
  role?: string;
  docId?: string;
}

const ClassManagement = () => {
  const [classes, setClasses] = useState<(Class & { teacherName?: string })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    teacherId: '',
    description: '',
    schedule: '',
    studentCount: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showUnassignedList, setShowUnassignedList] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesData = await Promise.all(querySnapshot.docs.map(async doc => {
        const classData = doc.data();
        // Fetch teacher info
        const teachersRef = collection(db, 'users');
        const q = query(teachersRef, where('role', '==', 'teacher'));
        const teacherSnapshot = await getDocs(q);
        let teacherName = classData.teacherId; // Default to ID if name not found
        
        const teacher = teacherSnapshot.docs.find(doc => doc.id === classData.teacherId);
        if (teacher) {
          const teacherData = teacher.data();
          teacherName = teacherData.name;
        }

        return {
          id: doc.id,
          name: classData.name,
          teacherId: classData.teacherId,
          description: classData.description,
          schedule: classData.schedule,
          studentCount: classData.studentCount,
          createdAt: classData.createdAt,
          teacherName
        };
      }));
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'classes', editingId), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'classes'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setShowForm(false);
      setFormData({
        name: '',
        teacherId: '',
        description: '',
        schedule: '',
        studentCount: 0,
      });
      setEditingId(null);
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
    }
  };

  const handleAssignStudent = async (student: User) => {
    if (!selectedClass) return;

    try {
      // Update class document to add student
      const classRef = doc(db, 'classes', selectedClass.id);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) return;
      
      const classData = classDoc.data();
      const students = classData.students || [];
      
      // Add student to class
      await updateDoc(classRef, {
        students: [...students, {
          id: student.id,
          name: student.name,
          email: student.email
        }],
        studentCount: students.length + 1
      });

      // Update student's teacherId
      const userRef = doc(db, 'users', student.id);
      await updateDoc(userRef, {
        teacherId: selectedClass.teacherId
      });

      // Refresh data
      fetchClasses();
      setShowUnassignedList(false);
    } catch (error) {
      console.error('Error assigning student:', error);
    }
  };

  const handleChangeTeacher = async (teacher: User) => {
    if (!selectedClass) return;

    try {
      // Update class document with new teacher
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        teacherId: teacher.id
      });

      // Update all students in the class with new teacherId
      const classDoc = await getDoc(classRef);
      if (classDoc.exists()) {
        const classData = classDoc.data();
        if (classData.students && Array.isArray(classData.students)) {
          for (const student of classData.students) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', student.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              await updateDoc(doc(db, 'users', userDoc.id), {
                teacherId: teacher.id
              });
            }
          }
        }
      }

      // Refresh data
      fetchClasses();
      setShowTeacherForm(false);
      setSelectedTeacher(null);
    } catch (error) {
      console.error('Error changing teacher:', error);
    }
  };

  const handleDelete = async (classId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      try {
        // Get the class document first
        const classRef = doc(db, 'classes', classId);
        const classDoc = await getDoc(classRef);
        
        if (classDoc.exists()) {
          const classData = classDoc.data();
          
          // If there are students in the class
          if (classData.students && Array.isArray(classData.students)) {
            // Get all student emails from the class
            const studentEmails = classData.students.map(student => student.email);
            
            // Update each student's document
            for (const email of studentEmails) {
              // Query users collection by email
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                // Update user document to set teacherId to empty string
                await updateDoc(doc(db, 'users', userDoc.id), {
                  teacherId: ""
                });
              }
            }
          }
        }
        
        // Delete the class document
        await deleteDoc(classRef);
        fetchClasses();
      } catch (error) {
        console.error('Error deleting class:', error);
      }
    }
  };

  // Get students from selected class
  useEffect(() => {
    const fetchClassStudents = async () => {
      if (!selectedClass) {
        setClassStudents([]);
        return;
      }

      try {
        const classRef = doc(db, 'classes', selectedClass.id);
        const classDoc = await getDoc(classRef);
        
        if (!classDoc.exists()) {
          return;
        }
        
        const classData = classDoc.data();
        
        if (classData.students && Array.isArray(classData.students)) {
          const studentsWithProfiles = await Promise.all(
            classData.students.map(async (student) => {
              try {
                // Query users collection by email field
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', student.email));
                const querySnapshot = await getDocs(q);

                let userData = null;
                let validatedAvatar: string | undefined = undefined;
                let userDocId: string | undefined = undefined;
                let userDocRef = null;

                if (!querySnapshot.empty) {
                    userDocRef = querySnapshot.docs[0];
                    userDocId = userDocRef.id;
                    userData = userDocRef.data();
                    validatedAvatar = userData?.avatar;
                }

                // Create student profile with validated data
                const studentWithProfile: Student = {
                    id: student.id,
                    name: userData?.name || student.name,
                    email: student.email,
                    classId: selectedClass.id,
                    avatar: validatedAvatar,
                    target: userData?.target || student.target,
                    role: userData?.role || student.role,
                    docId: userDocId
                };

                return studentWithProfile;
              } catch (error) {
                console.error('Error fetching user data:', error);
                // Return basic student info if there's an error
                return {
                  id: student.id,
                  name: student.name,
                  email: student.email,
                  classId: selectedClass.id,
                };
              }
            })
          );
          setClassStudents(studentsWithProfiles);
        } else {
          setClassStudents([]);
        }
      } catch (error: any) {
        console.error('Error fetching class students:', error);
        if (error.message) {
          console.error('Error details:', error.message);
        }
      }
    };

    fetchClassStudents();
  }, [selectedClass]);

  const handleClassSelect = (classData: Class) => {
    if (selectedClass?.id === classData.id) {
      setSelectedClass(null);
      setSelectedStudent(null);
    } else {
      setSelectedClass(classData);
      setSelectedStudent(null);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleEdit = (classData: Class) => {
    setSelectedClass(null);
    setSelectedStudent(null);
    setFormData({
      name: classData.name,
      teacherId: classData.teacherId,
      description: classData.description,
      schedule: classData.schedule,
      studentCount: classData.studentCount,
    });
    setEditingId(classData.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#fc5d01]">Quản lý lớp học</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
        >
          Thêm lớp học
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
              {editingId ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
            </h3>
            <form onSubmit={handleSubmit} className="text-black">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tên lớp</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Giáo viên</label>
                <button
                  type="button"
                  onClick={() => setShowTeacherForm(true)}
                  className="w-full p-2 border rounded-lg text-left bg-white hover:bg-gray-50"
                >
                  {formData.teacherId ? (
                    classes.find(c => c.teacherId === formData.teacherId)?.teacherName || formData.teacherId
                  ) : (
                    <span className="text-gray-500">Chọn giáo viên</span>
                  )}
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Lịch học</label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                  placeholder="VD: Thứ 2,4,6 - 18:00-20:00"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Số lượng học viên</label>
                <input
                  type="number"
                  value={formData.studentCount}
                  onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  required
                  min={0}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      name: '',
                      teacherId: '',
                      description: '',
                      schedule: '',
                      studentCount: 0,
                    });
                    setEditingId(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33]"
                >
                  {editingId ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class List */}
      <div className="bg-white rounded-lg shadow mb-6">
        <table className="min-w-full text-black">
          <thead className="bg-[#fc5d01]">
            <tr className="text-white">
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên lớp</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Giáo viên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Lịch học</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Số học viên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((classData) => (
              <tr 
                key={classData.id} 
                onClick={() => handleClassSelect(classData)}
                className={`cursor-pointer hover:bg-[#fedac2] ${selectedClass?.id === classData.id ? 'bg-[#fdbc94]' : ''}`}
              >
                <td className="px-6 py-4">{classData.name}</td>
                <td className="px-6 py-4">{classData.teacherName}</td>
                <td className="px-6 py-4">{classData.schedule}</td>
                <td className="px-6 py-4">{classData.studentCount}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(classData);
                    }}
                    className="text-[#fc5d01] hover:text-[#fd7f33] mr-2"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(classData.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Class Students */}
      {selectedClass && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#fc5d01]">
              Học viên lớp {selectedClass.name}
            </h3>
            <div className="space-x-2">
              <button
                onClick={() => setShowUnassignedList(true)}
                className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
              >
                Thêm học viên
              </button>
              <button
                onClick={() => setShowTeacherForm(true)}
                className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
              >
                Đổi giáo viên
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow">
            <table className="min-w-full text-black">
              <thead className="bg-[#fc5d01]">
                <tr className="text-white">
                  <th className="px-6 py-3 text-left text-sm font-semibold">Tên học viên</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                      Chưa có học viên trong lớp này
                    </td>
                  </tr>
                ) : (
                  classStudents.map((student) => (
                    <tr 
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      className={`cursor-pointer hover:bg-[#fedac2] ${selectedStudent?.id === student.id ? 'bg-[#fdbc94]' : ''}`}
                    >
                      <td className="px-6 py-4">{student.name}</td>
                      <td className="px-6 py-4">{student.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Student Submissions */}
      {selectedStudent && (
        <InlineStudentSubmissions 
          student={{
            id: selectedStudent.id,
            name: selectedStudent.name,
            email: selectedStudent.email,
            avatar: selectedStudent.avatar,
            target: selectedStudent.target
          }}
        />
      )}

      {/* Unassigned Students Modal */}
      {showUnassignedList && (
        <UnassignedStudentsList
          onSelect={handleAssignStudent}
          onClose={() => setShowUnassignedList(false)}
        />
      )}

      {/* Teachers List Modal */}
      {showTeacherForm && (
        <TeachersList
          onSelect={(teacher) => {
            if (selectedClass) {
              handleChangeTeacher(teacher);
            } else {
              setFormData(prev => ({
                ...prev,
                teacherId: teacher.id
              }));
            }
            setShowTeacherForm(false);
          }}
          onClose={() => setShowTeacherForm(false)}
        />
      )}
    </div>
  );
};

export default ClassManagement;
