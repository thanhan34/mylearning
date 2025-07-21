'use client';

import { useState, useEffect } from 'react';
import { User } from '../../../../types/admin';
import { db } from '../../../firebase/config';
import { Switch } from '@headlessui/react';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import SuccessNotification from '@/app/components/SuccessNotification';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classNameMap, setClassNameMap] = useState<{[key: string]: string}>({});
  const [showForm, setShowForm] = useState(false);
  const [showClassAssignModal, setShowClassAssignModal] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [showTeachers, setShowTeachers] = useState(false);
  const [showAssistants, setShowAssistants] = useState(false);
  const [notification, setNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'student' as 'teacher' | 'student' | 'assistant',
    teacherId: '',
    supportingTeacherId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchClasses();
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

  const fetchClasses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classesData);
      
      // Create class name mapping for quick lookup
      const nameMap: {[key: string]: string} = {};
      classesData.forEach((classItem: any) => {
        nameMap[classItem.id] = classItem.name;
      });
      setClassNameMap(nameMap);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleAssignClassesToAssistant = async (assistant: User) => {
    setSelectedAssistant(assistant);
    setShowClassAssignModal(true);
  };

  const handleClassAssignment = async (classIds: string[]) => {
    if (!selectedAssistant) return;

    try {
      await updateDoc(doc(db, 'users', selectedAssistant.id), {
        assignedClassIds: classIds
      });
      
      setNotification({
        message: `Đã chỉ định ${classIds.length} lớp cho trợ giảng ${selectedAssistant.name}`,
        show: true
      });
      
      setShowClassAssignModal(false);
      setSelectedAssistant(null);
      fetchUsers();
    } catch (error) {
      console.error('Error assigning classes to assistant:', error);
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
      setFormData({ email: '', name: '', role: 'student', teacherId: '', supportingTeacherId: '' });
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
      teacherId: user.teacherId || '',
      supportingTeacherId: user.supportingTeacherId || ''
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'teacher': return 'Giáo viên';
      case 'student': return 'Học viên';
      case 'assistant': return 'Trợ giảng';
      default: return role;
    }
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[#fc5d01]">Quản lý tài khoản</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
            >
              <span>{isFullscreen ? '🗗' : '🗖'}</span>
              <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
            >
              Thêm tài khoản
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
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
                    if (checked) {
                      setShowTeachers(false);
                      setShowAssistants(false);
                    }
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
                    if (checked) {
                      setShowUnassigned(false);
                      setShowAssistants(false);
                    }
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
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showAssistants}
                  onChange={(checked) => {
                    setShowAssistants(checked);
                    if (checked) {
                      setShowUnassigned(false);
                      setShowTeachers(false);
                    }
                  }}
                  className={`${
                    showAssistants ? 'bg-[#fc5d01]' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                >
                  <span
                    className={`${
                      showAssistants ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className="text-sm text-gray-600">Chỉ hiện trợ giảng</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
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
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'teacher' | 'student' | 'assistant' })}
                  className="w-full p-2 border rounded-lg text-black"
                >
                  <option value="student">Học viên</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="assistant">Trợ giảng</option>
                </select>
              </div>
              {formData.role === 'assistant' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-black">Giáo viên hỗ trợ</label>
                  <select
                    value={formData.supportingTeacherId}
                    onChange={(e) => setFormData({ ...formData, supportingTeacherId: e.target.value })}
                    className="w-full p-2 border rounded-lg text-black"
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
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ email: '', name: '', role: 'student', teacherId: '', supportingTeacherId: '' });
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

      <div className="bg-white rounded-lg shadow text-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#fc5d01]">
              <tr className="text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Tên</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Vai trò</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Lớp học</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Ngày tạo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap min-w-[200px]">Phân công</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
            {users
              .filter((user) => {
                const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   user.email?.toLowerCase().includes(searchTerm.toLowerCase());
                if (showUnassigned) {
                  return matchesSearch && user.role === 'student' && !user.teacherId;
                }
                if (showTeachers) {
                  return matchesSearch && user.role === 'teacher';
                }
                if (showAssistants) {
                  return matchesSearch && user.role === 'assistant';
                }
                return matchesSearch;
              })
              .map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-4 py-4 whitespace-nowrap">{user.name}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getRoleDisplayName(user.role)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {user.role === 'student' ? (
                    user.classId ? (
                      <span className="px-2 py-1 bg-[#fedac2] text-[#fc5d01] rounded-full text-sm font-medium">
                        {classNameMap[user.classId] || 'Đang tải...'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        Chưa phân lớp
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-4 min-w-[200px]">
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
                  {user.role === 'assistant' && (
                    <div className="space-y-2">
                      <select
                        value={user.supportingTeacherId || ''}
                        onChange={async (e) => {
                          const supportingTeacherId = e.target.value;
                          try {
                            await updateDoc(doc(db, 'users', user.id), {
                              supportingTeacherId: supportingTeacherId || null
                            });
                            fetchUsers();
                          } catch (error) {
                            console.error('Error updating assistant assignment:', error);
                          }
                        }}
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        <option value="">Chọn giáo viên hỗ trợ</option>
                        {users
                          .filter((u) => u.role === 'teacher')
                          .map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAssignClassesToAssistant(user)}
                        className="w-full px-2 py-1 bg-[#fc5d01] text-white text-xs rounded hover:bg-[#fd7f33]"
                      >
                        Chỉ định lớp ({user.assignedClassIds?.length || 0})
                      </button>
                      {user.assignedClassIds && user.assignedClassIds.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {user.assignedClassIds.map(classId => {
                            const classInfo = classes.find(c => c.id === classId);
                            return classInfo ? classInfo.name : classId;
                          }).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  {user.role === 'teacher' && (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-[#fc5d01] hover:text-[#fd7f33] text-sm"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Assignment Modal */}
      {showClassAssignModal && selectedAssistant && (
        <ClassAssignmentModal
          assistant={selectedAssistant}
          classes={classes}
          onAssign={handleClassAssignment}
          onClose={() => {
            setShowClassAssignModal(false);
            setSelectedAssistant(null);
          }}
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

// Class Assignment Modal Component
const ClassAssignmentModal = ({ 
  assistant, 
  classes, 
  onAssign, 
  onClose 
}: {
  assistant: User;
  classes: any[];
  onAssign: (classIds: string[]) => void;
  onClose: () => void;
}) => {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    assistant.assignedClassIds || []
  );

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
          Chỉ định lớp cho trợ giảng: {assistant.name}
        </h3>
        
        <div className="space-y-2 mb-6">
          {classes.map(classItem => (
            <label key={classItem.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedClassIds.includes(classItem.id)}
                onChange={() => handleClassToggle(classItem.id)}
                className="rounded border-gray-300 text-[#fc5d01] focus:ring-[#fc5d01]"
              />
              <span className="text-black">
                {classItem.name} 
                <span className="text-gray-500 text-sm ml-2">
                  ({classItem.students?.length || 0} học viên)
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Hủy
          </button>
          <button
            onClick={() => onAssign(selectedClassIds)}
            className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33]"
          >
            Lưu ({selectedClassIds.length} lớp)
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
