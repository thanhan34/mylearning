'use client';

import { useState, useEffect } from 'react';
import { Class } from '../../../../types/admin';
import { db } from '../../../firebase/config';
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, updateDoc, query, where } from 'firebase/firestore';
import InlineStudentSubmissions from '../../class/components/InlineStudentSubmissions';

interface Student {
  id: string;
  name: string;
  email: string;
  classId?: string;
}

interface FirebaseUser {
  id: string;
  name: string;
  email: string;
  role: string;
  classId?: string;
  class?: string;
}

const ClassManagement = () => {
  const [classes, setClasses] = useState<Class[]>([]);
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

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Class));
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

  // Get students from selected class
  useEffect(() => {
    const fetchClassStudents = async () => {
      if (!selectedClass) {
        setClassStudents([]);
        return;
      }

      try {
        console.log('Getting students from class:', selectedClass.id);
        const classRef = doc(db, 'classes', selectedClass.id);
        const classDoc = await getDoc(classRef);
        
        if (!classDoc.exists()) {
          console.error('Class document not found');
          return;
        }
        
        const classData = classDoc.data();
        console.log('Class data:', classData);
        
        if (classData.students && Array.isArray(classData.students)) {
          console.log('Found students:', classData.students);
          setClassStudents(classData.students.map(student => ({
            id: student.id,
            name: student.name,
            email: student.email,
            classId: selectedClass.id
          })));
        } else {
          console.log('No students array in class document');
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

  // Debug log when classStudents changes
  useEffect(() => {
    console.log('Updated classStudents:', classStudents);
  }, [classStudents]);

  const handleClassSelect = (classData: Class) => {
    console.log('Class selected:', classData);
    if (selectedClass?.id === classData.id) {
      console.log('Deselecting class');
      setSelectedClass(null);
      setSelectedStudent(null);
    } else {
      console.log('Setting new selected class');
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
              <div className="mb-4 ">
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
                <label className="block text-sm font-medium mb-1">Giáo viên ID</label>
                <input
                  type="text"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
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
                <td className="px-6 py-4">{classData.teacherId}</td>
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
          <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
            Học viên lớp {selectedClass.name}
          </h3>
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
            email: selectedStudent.email,
            name: selectedStudent.name
          }} 
        />
      )}
    </div>
  );
};

export default ClassManagement;
