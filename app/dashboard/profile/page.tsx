'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { ClassInfo, UserProfile } from '../../../types/profile';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          const userRef = doc(db, 'users', session.user.email);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            setName(userData.name || '');
            setEmail(userData.email || '');
            setAvatar(userData.avatar || '');
            
            // Fetch classes for students
            if (userData.role === 'student' && userData.classId) {
              const classRef = doc(db, 'classes', userData.classId);
              const classSnap = await getDoc(classRef);
              if (classSnap.exists()) {
                setClasses([classSnap.data() as ClassInfo]);
              }
            }
          } else {
            // Create user document if it doesn't exist
            await setDoc(userRef, {
              email: session.user.email,
              name: session.user.name || '',
              role: (session.user as any)?.role || 'student',
              createdAt: new Date().toISOString()
            });
            setName(session.user.name || '');
            setEmail(session.user.email || '');
          }
          setLoading(false);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setMessage({ type: 'error', content: 'Error loading profile data' });
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

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', content: 'Image size must be less than 2MB' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: 'info', content: 'Uploading image...' });

      // Upload to Cloudinary first
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
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Then handle Firestore update
      const userRef = doc(db, 'users', session.user.email);
      const userSnap = await getDoc(userRef);

      if (data.secure_url) {
        if (!userSnap.exists()) {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            email: session.user.email,
            name: session.user.name || '',
            role: (session.user as any)?.role || 'student',
            createdAt: new Date().toISOString(),
            avatar: data.secure_url
          });
        } else {
          // Update existing document
          await updateDoc(userRef, {
            avatar: data.secure_url
          });
        }
        
        setAvatar(data.secure_url);
        setMessage({ type: 'success', content: 'Avatar updated successfully' });
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setMessage({ 
        type: 'error', 
        content: error.message || 'Error updating avatar. Please try again.' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session?.user?.email) {
      try {
        const userRef = doc(db, 'users', session.user.email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: session.user.email,
              name: name,
              role: (session.user as any)?.role || 'student',
              createdAt: new Date().toISOString()
            });
        } else {
          await updateDoc(userRef, {
            name,
            email
          });
        }
        setMessage({ type: 'success', content: 'Profile updated successfully' });
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setMessage({ 
          type: 'error', 
          content: error.message || 'Error updating profile' 
        });
      }
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', content: 'Passwords do not match' });
      return;
    }

    try {
      if (!auth.currentUser) {
        throw new Error('Please sign in again to change password');
      }

      await updatePassword(auth.currentUser, newPassword);
      setMessage({ type: 'success', content: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      setMessage({ 
        type: 'error', 
        content: error.message || 'Error updating password' 
      });
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-[#fc5d01]">Profile Settings</h1>
      
      {message.content && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' ? 'bg-[#fedac2] text-[#fc5d01]' : 
          message.type === 'info' ? 'bg-blue-100 text-blue-700' :
          'bg-red-100 text-red-700'
        }`}>
          {message.content}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Personal Information</h2>
          
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              {avatar ? (
                <Image
                  src={avatar}
                  alt="Profile"
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              ) : (
                <div className="w-24 h-24 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <span className="text-2xl text-[#fc5d01]">{name.charAt(0)}</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`bg-[#fc5d01] text-white px-4 py-2 rounded cursor-pointer hover:bg-[#fd7f33] ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </label>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#fc5d01]"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#fc5d01]"
                disabled
              />
            </div>

            <button
              type="submit"
              className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
            >
              Update Profile
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Change Password</h2>
          
          <form onSubmit={handlePasswordChange}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#fc5d01]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#fc5d01]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#fc5d01]"
              />
            </div>

            <button
              type="submit"
              className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33]"
            >
              Change Password
            </button>
          </form>
        </div>

        {classes.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">My Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((classInfo: ClassInfo) => (
                <div key={classInfo.id} className="border p-4 rounded">
                  <h3 className="font-semibold text-lg">{classInfo.name}</h3>
                  <p className="text-gray-600">Teacher: {classInfo.teacherName}</p>
                  <p className="text-gray-600">Schedule: {classInfo.schedule}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
