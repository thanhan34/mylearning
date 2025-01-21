'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { UserProfile } from '../../../types/profile';
import { updateStudentName } from '../../firebase/services/class';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [target, setTarget] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [mounted, setMounted] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          if (!session.user.id) return;
          const userRef = doc(db, 'users', session.user.id);
          const userSnap = await getDoc(userRef);          
          const userData = userSnap.data() as UserProfile;
          setName(userData.name || '');
          setEmail(userData.email || '');
          setAvatar(userData.avatar || '');
          setTarget(userData.target || '');
          setClassId(userData.classId || null);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setMessage({ type: 'error', content: 'Không thể tải thông tin người dùng' });
          setLoading(false);
        }
      }
    };

    if (mounted) {
      fetchUserData();
    }
  }, [session, mounted]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file || !session?.user?.email) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', content: 'Kích thước ảnh phải nhỏ hơn 2MB' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: 'info', content: 'Đang tải ảnh lên...' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'mylearning');
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Tải lên thất bại');
      }

      const data = await response.json();

      if (!session.user.id) return;
      const userRef = doc(db, 'users', session.user.id);
      
      if (data.secure_url) {
        await updateDoc(userRef, {
          avatar: data.secure_url
        });
        
        setAvatar(data.secure_url);
        setMessage({ type: 'success', content: 'Cập nhật ảnh đại diện thành công' });
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setMessage({ 
        type: 'error', 
        content: error.message || 'Lỗi cập nhật ảnh đại diện. Vui lòng thử lại.' 
      });
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setMessage({ type: 'error', content: 'Vui lòng nhập họ và tên' });
      return false;
    }
    if (session?.user?.role === 'student' && target) {
      const targetMatch = target.match(/^Target\s+(\d+)$/);
      if (!targetMatch) {
        setMessage({ type: 'error', content: 'Định dạng mục tiêu không hợp lệ' });
        return false;
      }
      const targetScore = parseInt(targetMatch[1]);
      if (targetScore < 0 || targetScore > 90) {
        setMessage({ type: 'error', content: 'Mục tiêu điểm số phải từ 0 đến 90' });
        return false;
      }
    }
    return true;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    if (session?.user?.id) {
      setUpdating(true);
      try {
        if (session.user.role === 'student' && classId) {
          // For students, update both collections atomically
          await updateStudentName(session.user.id, classId, name, email, target);
        } else {
          // For non-students, just update user document
          const userRef = doc(db, 'users', session.user.id);
          await updateDoc(userRef, {
            name,
            email,
            target
          });
        }

        setMessage({ type: 'success', content: 'Cập nhật thông tin thành công' });
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setMessage({ 
          type: 'error', 
          content: error.message || 'Lỗi cập nhật thông tin' 
        });
      } finally {
        setUpdating(false);
      }
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-white to-[#fedac2] rounded-xl p-8 shadow-lg animate-pulse">
          <div className="h-8 w-48 bg-[#fedac2] rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
              <div className="h-6 w-32 bg-[#fedac2] rounded"></div>
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 bg-[#fedac2] rounded-full"></div>
                <div className="h-10 w-32 bg-[#fedac2] rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-24 bg-[#fedac2] rounded"></div>
                <div className="h-10 w-full bg-[#fedac2] rounded"></div>
                <div className="h-4 w-24 bg-[#fedac2] rounded"></div>
                <div className="h-10 w-full bg-[#fedac2] rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-white to-[#fedac2] rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#fc5d01]">Thông tin cá nhân</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin cá nhân của bạn</p>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        
        {message.content && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
            message.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' :
            'bg-red-50 border-red-200 text-red-700'
          } flex items-center`}>
            <div className="mr-3">
              {message.type === 'success' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {message.type === 'error' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {message.content}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Thông tin chung</h2>
            
            <div className="mb-8">
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  {avatar ? (
                    <div className="relative w-24 h-24">
                      <Image
                        src={avatar}
                        alt="Profile"
                        fill
                        className="rounded-full object-cover"
                      />
                      {uploading ? (
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <label
                            htmlFor="avatar-upload"
                            className="text-white text-sm cursor-pointer hover:underline"
                          >
                            Thay đổi
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-[#fedac2] rounded-full flex items-center justify-center group-hover:bg-[#fdbc94] transition-colors duration-200">
                      <span className="text-2xl text-[#fc5d01]">{name.charAt(0)}</span>
                      <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <label
                          htmlFor="avatar-upload"
                          className="text-white text-sm cursor-pointer"
                        >
                          Thêm ảnh
                        </label>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                    disabled={uploading}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{name || 'Chưa có tên'}</h3>
                  <p className="text-sm text-gray-500">{session?.user?.role === 'teacher' ? 'Giảng viên' : 'Học viên'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent transition-all duration-200"
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  disabled
                />
              </div>

              {session?.user?.role === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mục tiêu điểm số
                  </label>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Ví dụ: Target 30"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent transition-all duration-200"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Định dạng: Target X (Ví dụ: Target 30, Target 42, Target 50)
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={updating}
                className={`w-full bg-[#fc5d01] text-white px-6 py-3 rounded-lg hover:bg-[#fd7f33] focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:ring-offset-2 transition-all duration-200 relative ${
                  updating ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {updating ? (
                  <>
                    <span className="opacity-0">Cập nhật thông tin</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </>
                ) : (
                  'Cập nhật thông tin'
                )}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Thông tin bảo mật</h2>
              <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-[#fedac2] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#fc5d01]" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Đăng nhập bằng Google</h3>
                    <p className="text-sm text-gray-500">{email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Kết nối với PTE Intensive</h2>
              <div className="space-y-4">
                <a 
                  href="https://www.pteintensive.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-10 h-10 bg-[#fedac2] rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#fc5d01]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0z"/>
                      <path d="M12 8v8M8 12h8"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Website chính thức</span>
                    <span className="text-xs text-gray-500">www.pteintensive.com</span>
                  </div>
                </a>

                <a 
                  href="https://www.facebook.com/pteintensive" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-10 h-10 bg-[#fedac2] rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#fc5d01]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Facebook Page</span>
                    <span className="text-xs text-gray-500">Cập nhật tin tức và sự kiện mới nhất</span>
                  </div>
                </a>

                <a 
                  href="https://www.facebook.com/groups/pteintensive" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-10 h-10 bg-[#fedac2] rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#fc5d01]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Facebook Group</span>
                    <span className="text-xs text-gray-500">Tham gia cộng đồng học viên</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
