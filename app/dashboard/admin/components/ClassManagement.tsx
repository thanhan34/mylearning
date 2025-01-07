'use client';

import { useState, useEffect } from 'react';
import { Class } from '@/types/admin';
import { db } from '@/app/firebase/config';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';

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

  const handleEdit = (classData: Class) => {
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
            <form onSubmit={handleSubmit}>
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

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-[#fedac2]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên lớp</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Giáo viên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Lịch học</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Số học viên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((classData) => (
              <tr key={classData.id}>
                <td className="px-6 py-4">{classData.name}</td>
                <td className="px-6 py-4">{classData.teacherId}</td>
                <td className="px-6 py-4">{classData.schedule}</td>
                <td className="px-6 py-4">{classData.studentCount}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(classData)}
                    className="text-[#fc5d01] hover:text-[#fd7f33] mr-2"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(classData.id)}
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
    </div>
  );
};

export default ClassManagement;
