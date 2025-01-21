'use client';

import { useState, useEffect } from 'react';
import { User } from '../../../../types/admin';
import { db } from '../../../firebase/config';
import { Switch } from '@headlessui/react';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [showTeachers, setShowTeachers] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'student' as 'teacher' | 'student',
    teacherId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setShowForm(false);
      setFormData({ email: '', name: '', role: 'student', teacherId: '' });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      teacherId: user.teacherId || ''
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[#fc5d01]">Quản lý tài khoản</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
          >
            Thêm tài khoản
          </button>
        </div>
        
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
            />
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showUnassigned}
                  onChange={(checked) => {
                    setShowUnassigned(checked);
                    if (checked) setShowTeachers(false);
                  }}
                  className={`${
                    showUnassigned ? 'bg-[#fc5d01]' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                >
                  <span
                    className={`${
                      showUnassigned ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className="text-sm text-gray-600">Chỉ hiện học viên chưa được phân công</span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showTeachers}
                  onChange={(checked) => {
                    setShowTeachers(checked);
                    if (checked) setShowUnassigned(false);
                  }}
                  className={`${
                    showTeachers ? 'bg-[#fc5d01]' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                >
                  <span
                    className={`${
                      showTeachers ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className="text-sm text-gray-600">Chỉ hiện giáo viên</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
              {editingId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-black">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-black">Tên</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg text-black"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-black">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'teacher' | 'student' })}
                  className="w-full p-2 border rounded-lg text-black"
                >
                  <option value="student">Học viên</option>
                  <option value="teacher">Giáo viên</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ email: '', name: '', role: 'student', teacherId: '' });
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

      <div className="bg-white rounded-lg shadow text-black">
        <table className="min-w-full">
          <thead className="bg-[#fc5d01]">
            <tr className="text-white">
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Vai trò</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ngày tạo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Giáo viên phụ trách</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users
              .filter((user) => {
                const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase());
                if (showUnassigned) {
                  return matchesSearch && user.role === 'student' && !user.teacherId;
                }
                if (showTeachers) {
                  return matchesSearch && user.role === 'teacher';
                }
                return matchesSearch;
              })
              .map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4">
                  {user.role === 'teacher' ? 'Giáo viên' : 'Học viên'}
                </td>
                <td className="px-6 py-4">
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4">
                  {user.role === 'student' && (
                    <select
                      value={user.teacherId || ''}
                      onChange={async (e) => {
                        const teacherId = e.target.value;
                        try {
                          // Update student's teacherId
                          await updateDoc(doc(db, 'users', user.id), {
                            teacherId: teacherId || null
                          });
                          
                          // Update teacher's assignedStudents
                          if (teacherId) {
                            const teacherRef = doc(db, 'users', teacherId);
                            await updateDoc(teacherRef, {
                              assignedStudents: arrayUnion(user.id)
                            });
                          }
                          
                          if (user.teacherId && user.teacherId !== teacherId) {
                            // Remove student from previous teacher's assignedStudents
                            const prevTeacherRef = doc(db, 'users', user.teacherId);
                            await updateDoc(prevTeacherRef, {
                              assignedStudents: arrayRemove(user.id)
                            });
                          }
                          
                          fetchUsers();
                        } catch (error) {
                          console.error('Error updating teacher assignment:', error);
                        }
                      }}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">Chọn giáo viên</option>
                      {users
                        .filter((u) => u.role === 'teacher')
                        .map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-[#fc5d01] hover:text-[#fd7f33] mr-2"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
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

export default UserManagement;
