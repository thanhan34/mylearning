'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/admin';
import { db } from '@/app/firebase/config';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'student' as 'teacher' | 'student',
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
      setFormData({ email: '', name: '', role: 'student' });
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
      role: user.role
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#fc5d01]">Quản lý tài khoản</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
        >
          Thêm tài khoản
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
              {editingId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tên</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'teacher' | 'student' })}
                  className="w-full p-2 border rounded-lg"
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
                    setFormData({ email: '', name: '', role: 'student' });
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Vai trò</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ngày tạo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
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
