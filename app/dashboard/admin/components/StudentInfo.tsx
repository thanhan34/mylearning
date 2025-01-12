'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { UserProfile } from '../../../../types/profile';
import Image from 'next/image';

interface StudentInfoProps {
  student?: {
    name: string;
    email: string;
    avatar?: string;
    target?: string;
  };
  studentEmail?: string;
}

const StudentInfo = ({ student, studentEmail }: StudentInfoProps) => {
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(student?.avatar);
  const [userData, setUserData] = useState<{
    name: string;
    avatar?: string;
    target?: string;
  } | null>(null);

  // Load user data if only email is provided
  useEffect(() => {
    const loadUserData = async () => {
      if (!studentEmail || student) return;

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', studentEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const data = userDoc.data();
          setUserData({
            name: data.name,
            avatar: data.avatar,
            target: data.target
          });
          setAvatarUrl(data.avatar);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [studentEmail, student]);

    // Update avatar URL when student changes
  useEffect(() => {
    if (!student) return;

    setAvatarError(false);
    setAvatarUrl(student.avatar);

    console.log('StudentInfo received:', {
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      hasAvatar: Boolean(student.avatar)
    });
  }, [student]);

  const displayData = student || userData;

  return displayData ? (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center space-x-4">
        {avatarUrl && !avatarError ? (
          <div className="relative w-16 h-16">
            <div className="overflow-hidden rounded-full">
              <Image
                src={avatarUrl}
                alt={displayData.name}
                width={64}
                height={64}
                className="object-cover"
                priority
                quality={75}
                sizes="64px"
                style={{
                  width: '100%',
                  height: '100%',
                  minWidth: '64px',
                  minHeight: '64px'
                }}
                onLoadingComplete={(result) => {
                  const aspectRatio = result.naturalWidth / result.naturalHeight;
                  if (aspectRatio === 0 || aspectRatio === Infinity) {
                    setAvatarError(true);
                  }
                  console.log('Avatar image loaded:', {
                    url: avatarUrl,
                    width: result.naturalWidth,
                    height: result.naturalHeight,
                    aspectRatio
                  });
                }}
                onError={() => {
                  console.error('Error loading avatar for student:', {
                    name: displayData.name,
                    url: avatarUrl,
                    timestamp: new Date().toISOString()
                  });
                  setAvatarError(true);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#fedac2] flex items-center justify-center">
            <span className="text-[#fc5d01] text-xl font-semibold">
              {displayData.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-[#fc5d01]">{displayData.name}</h3>
          <h4>{displayData.email}</h4>
          {displayData.target && (
            <p className="text-[#fd7f33] mt-1">
              Target: <span className="font-medium">{displayData.target}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  ) : null;
};

export default StudentInfo;
