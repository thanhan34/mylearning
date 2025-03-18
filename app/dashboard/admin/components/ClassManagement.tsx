'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Class, User } from '../../../../types/admin';
import { db } from '../../../firebase/config';
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, updateDoc, query, where, DocumentData, QueryDocumentSnapshot, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import InlineStudentSubmissions from '../../class/components/InlineStudentSubmissions';
import UnassignedStudentsList from '../../class/components/UnassignedStudentsList';
import TeachersList from './TeachersList';
import WeeklyHomeworkTable from '../../class/components/WeeklyHomeworkTable';
import { getTeacherClasses, removeStudentFromClass, addStudentToClass, createClass } from '@/app/firebase/services/class';
import { addNotification } from '@/app/firebase/services/notification';
import SuccessNotification from '@/app/components/SuccessNotification';

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

interface ExtendedClass extends Class {
  students: Student[];
  teacherName?: string;
  status?: 'active' | 'completed'; // Use status field to track if students have passed
}

interface TeacherWithClasses {
  id: string;
  name: string;
  email: string;
  classes: ExtendedClass[];
}

const ClassManagement = () => {
  const [classes, setClasses] = useState<ExtendedClass[]>([]);
  const [teachersWithClasses, setTeachersWithClasses] = useState<TeacherWithClasses[]>([]);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [hideCompletedClasses, setHideCompletedClasses] = useState(false);
  const [showHiddenClassesCount, setShowHiddenClassesCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    teacherId: '',
    description: '',
    schedule: '',
    studentCount: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<ExtendedClass | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showUnassignedList, setShowUnassignedList] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [notification, setNotification] = useState<{message: string, show: boolean}>({message: '', show: false});

  const fetchClasses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesData = await Promise.all(querySnapshot.docs.map(async (docSnapshot: QueryDocumentSnapshot) => {
        const classData = docSnapshot.data() as DocumentData;
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

        // Get actual student count from students array
        const students = classData.students || [];

        return {
          id: docSnapshot.id,
          name: classData.name,
          teacherId: classData.teacherId,
          description: classData.description || '',
          schedule: classData.schedule || '',
          studentCount: students.length, // Use actual length instead of stored count
          createdAt: classData.createdAt || new Date().toISOString(),
          teacherName,
          students: students,
          status: classData.status || 'active' // Default to active if not specified
        };
      }));
      console.log('Fetched classes:', classesData); // Debug log
      setClasses(classesData);
      
      // Group classes by teacher
      const teacherMap = new Map<string, TeacherWithClasses>();
      
      // First, get all teachers
      const teachersRef = collection(db, 'users');
      const q = query(teachersRef, where('role', '==', 'teacher'));
      const teacherSnapshot = await getDocs(q);
      
      teacherSnapshot.docs.forEach(doc => {
        const teacherData = doc.data();
        teacherMap.set(doc.id, {
          id: doc.id,
          name: teacherData.name,
          email: teacherData.email,
          classes: []
        });
      });
      
      // Count completed classes
      const completedClassesCount = classesData.filter(c => c.status === 'completed').length;
      setShowHiddenClassesCount(completedClassesCount);
      
      // Then assign classes to teachers
      classesData.forEach(classItem => {
        // Skip completed classes if hideCompletedClasses is true
        if (hideCompletedClasses && classItem.status === 'completed') {
          return;
        }
        
        if (teacherMap.has(classItem.teacherId)) {
          const teacher = teacherMap.get(classItem.teacherId)!;
          teacher.classes.push(classItem);
        } else {
          // Handle classes with unknown teachers
          teacherMap.set(classItem.teacherId, {
            id: classItem.teacherId,
            name: classItem.teacherName || 'Unknown Teacher',
            email: '',
            classes: [classItem]
          });
        }
      });
      
      setTeachersWithClasses(Array.from(teacherMap.values()));
      
      // Expand all teachers by default
      setExpandedTeachers(new Set(Array.from(teacherMap.keys())));
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Initial data fetch and refetch when hideCompletedClasses changes
  useEffect(() => {
    fetchClasses();
  }, [hideCompletedClasses]);

  useEffect(() => {
    // Set up real-time listener for classes
    const classesRef = collection(db, 'classes');
    const unsubscribe = onSnapshot(classesRef, async (snapshot: QuerySnapshot<DocumentData>) => {
      const classesData = await Promise.all(snapshot.docs.map(async (docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
        const classData = docSnapshot.data() as DocumentData;
        // Fetch teacher info
        const teachersRef = collection(db, 'users');
        const q = query(teachersRef, where('role', '==', 'teacher'));
        const teacherSnapshot = await getDocs(q);
        let teacherName = classData.teacherId;
        
        const teacher = teacherSnapshot.docs.find(doc => doc.id === classData.teacherId);
        if (teacher) {
          const teacherData = teacher.data();
          teacherName = teacherData.name;
        }

        const students = classData.students || [];

        return {
          id: docSnapshot.id,
          name: classData.name,
          teacherId: classData.teacherId,
          description: classData.description || '',
          schedule: classData.schedule || '',
          studentCount: students.length,
          createdAt: classData.createdAt || new Date().toISOString(),
          teacherName,
          students: students,
          status: classData.status || 'active' // Default to active if not specified
        };
      }));

      setClasses(classesData);
      
      // Group classes by teacher
      const teacherMap = new Map<string, TeacherWithClasses>();
      
      // First, get all teachers
      const teachersRef = collection(db, 'users');
      const q = query(teachersRef, where('role', '==', 'teacher'));
      const teacherSnapshot = await getDocs(q);
      
      teacherSnapshot.docs.forEach(doc => {
        const teacherData = doc.data();
        teacherMap.set(doc.id, {
          id: doc.id,
          name: teacherData.name,
          email: teacherData.email,
          classes: []
        });
      });
      
      // Then assign classes to teachers
      classesData.forEach(classItem => {
        // Skip completed classes if hideCompletedClasses is true
        if (hideCompletedClasses && classItem.status === 'completed') {
          return;
        }
        
        if (teacherMap.has(classItem.teacherId)) {
          const teacher = teacherMap.get(classItem.teacherId)!;
          teacher.classes.push(classItem);
        } else {
          // Handle classes with unknown teachers
          teacherMap.set(classItem.teacherId, {
            id: classItem.teacherId,
            name: classItem.teacherName || 'Unknown Teacher',
            email: '',
            classes: [classItem]
          });
        }
      });
      
      setTeachersWithClasses(Array.from(teacherMap.values()));
      
      // Update selected class if it exists
      if (selectedClass) {
        const updatedClass = classesData.find(c => c.id === selectedClass.id);
        if (updatedClass) {
          setSelectedClass(updatedClass);
          setClassStudents(updatedClass.students);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedClass?.id, hideCompletedClasses]);
  
  const toggleTeacherExpanded = (teacherId: string) => {
    const newExpandedTeachers = new Set(expandedTeachers);
    if (newExpandedTeachers.has(teacherId)) {
      newExpandedTeachers.delete(teacherId);
    } else {
      newExpandedTeachers.add(teacherId);
    }
    setExpandedTeachers(newExpandedTeachers);
  };

  const handleSubmit = async (e: FormEvent) => {
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
          createdAt: new Date().toISOString(),
          students: []
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

  const handleClassSelect = (classData: ExtendedClass) => {
    if (selectedClass?.id === classData.id) {
      setSelectedClass(null);
      setSelectedStudent(null);
    } else {
      setSelectedClass(classData);
      setClassStudents(classData.students);
      setSelectedStudent(null);
    }
  };

  const handleEdit = (classData: ExtendedClass) => {
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

  const handleDelete = async (classId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      try {
        await deleteDoc(doc(db, 'classes', classId));
        fetchClasses();
      } catch (error) {
        console.error('Error deleting class:', error);
      }
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleChangeTeacher = async (teacher: User) => {
    if (!selectedClass) return;

    try {
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        teacherId: teacher.id
      });

      // Update all students' teacherId
      const promises = selectedClass.students.map(async (student) => {
        const userRef = doc(db, 'users', student.id);
        await updateDoc(userRef, {
          teacherId: teacher.id
        });
      });

      await Promise.all(promises);
      fetchClasses();
    } catch (error) {
      console.error('Error changing teacher:', error);
    }
  };

  const handleAssignStudent = async (student: User) => {
    if (!selectedClass) return;

    try {
      // Add student to class using service function
      const success = await addStudentToClass(
        selectedClass.id,
        {
          id: student.id,
          name: student.name,
          email: student.email
        },
        selectedClass.teacherId
      );

      if (!success) {
        console.error('Failed to add student to class');
        return;
      }

      // Add notification
      await addNotification(student.email, `Bạn đã được thêm vào lớp ${selectedClass.name}`, 'teacher');
      
      // Show success notification
      setNotification({
        message: `Đã thêm học viên ${student.name} vào lớp ${selectedClass.name}`,
        show: true
      });

      // Refresh data
      fetchClasses();
      setShowUnassignedList(false);
    } catch (error) {
      console.error('Error assigning student:', error);
    }
  };
  
  // Function to toggle class status between active and completed
  const toggleClassStatus = async (classId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'completed' : 'active';
      const classRef = doc(db, 'classes', classId);
      
      // Update the status field in the database
      await updateDoc(classRef, {
        status: newStatus
      });
      
      // Update the local state to reflect the change immediately
      setClasses(prevClasses => 
        prevClasses.map(c => 
          c.id === classId ? {...c, status: newStatus} : c
        )
      );
      
      setNotification({
        message: `Đã ${newStatus === 'completed' ? 'đánh dấu lớp đã hoàn thành' : 'kích hoạt lại lớp'}`,
        show: true
      });
      
      // Force a refresh of the data
      fetchClasses();
    } catch (error) {
      console.error('Error updating class status:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#fc5d01]">Quản lý lớp học</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <label htmlFor="hideCompleted" className="mr-2 text-sm font-medium">
              Ẩn lớp đã hoàn thành
            </label>
            <button 
              onClick={() => setHideCompletedClasses(!hideCompletedClasses)}
              className="relative inline-block w-10 mr-2 align-middle select-none"
            >
              <input
                type="checkbox"
                id="hideCompleted"
                checked={hideCompletedClasses}
                onChange={() => {}}
                className="sr-only"
              />
              <div className={`block h-6 rounded-full w-10 ${hideCompletedClasses ? 'bg-[#fc5d01]' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideCompletedClasses ? 'transform translate-x-4' : ''}`}></div>
            </button>
            <span className="text-sm text-gray-600">
              {hideCompletedClasses 
                ? `Đang ẩn ${showHiddenClassesCount} lớp đã hoàn thành` 
                : `Hiển thị tất cả lớp (${showHiddenClassesCount} lớp đã hoàn thành)`}
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
          >
            Thêm lớp học
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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

      {/* Teachers with Classes */}
      <div className="space-y-4 mb-6">
        {teachersWithClasses.map((teacher) => (
          <div key={teacher.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Teacher Header */}
            <div 
              className="bg-[#fc5d01] text-white px-6 py-3 flex justify-between items-center cursor-pointer"
              onClick={() => toggleTeacherExpanded(teacher.id)}
            >
              <div className="flex items-center">
                <span className="font-semibold">{teacher.name}</span>
                <span className="ml-2 text-sm opacity-80">({teacher.classes.length} lớp)</span>
              </div>
              <div className="text-xl">
                {expandedTeachers.has(teacher.id) ? '▼' : '►'}
              </div>
            </div>
            
            {/* Classes Table */}
            {expandedTeachers.has(teacher.id) && (
              <table className="min-w-full text-black">
                <thead className="bg-[#fedac2]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Tên lớp</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Lịch học</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Số học viên</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teacher.classes.map((classData) => (
                    <tr 
                      key={classData.id} 
                      onClick={() => handleClassSelect(classData)}
                      className={`cursor-pointer hover:bg-[#fedac2] ${selectedClass?.id === classData.id ? 'bg-[#fdbc94]' : ''}`}
                    >
                      <td className="px-6 py-4">{classData.name}</td>
                      <td className="px-6 py-4">{classData.schedule}</td>
                      <td className="px-6 py-4">{classData.students.length}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(classData);
                            }}
                            className="text-[#fc5d01] hover:text-[#fd7f33]"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleClassStatus(classData.id, classData.status || 'active');
                            }}
                            className={`${classData.status === 'completed' ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                          >
                            {classData.status === 'completed' ? 'Kích hoạt' : 'Hoàn thành'}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>


      {/* Weekly Homework Table */}
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
          <div className="bg-white rounded-lg shadow p-4">
            <WeeklyHomeworkTable 
              classId={selectedClass.id}
              students={selectedClass.students}
              showPassedStudents={true}
              onStudentSelect={handleStudentSelect}
              onRemoveStudent={async (studentId) => {
                if (selectedClass) {
                  const student = selectedClass.students.find(s => s.id === studentId);
                  if (student) {
                    await removeStudentFromClass(selectedClass.id, studentId);
                    await addNotification(student.email, `Bạn đã được xóa khỏi lớp ${selectedClass.name}`, 'teacher');
                    setNotification({
                      message: `Đã xóa học viên ${student.name} khỏi lớp ${selectedClass.name}`,
                      show: true
                    });
                    fetchClasses();
                  }
                }
              }}
              onStudentPassedChange={fetchClasses}
            />
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

      {/* Success Notification */}
      {notification.show && (
        <SuccessNotification
          message={notification.message}
          onClose={() => setNotification({message: '', show: false})}
        />
      )}
    </div>
  );
};

export default ClassManagement;
