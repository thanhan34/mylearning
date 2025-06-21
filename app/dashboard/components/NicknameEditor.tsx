'use client';

import { useState } from 'react';
import { setStudentNickname } from '@/app/firebase/services/student-nickname';

interface NicknameEditorProps {
  studentId: string;
  teacherId: string;
  currentNickname?: string;
  studentName: string;
  onNicknameUpdate: (studentId: string, nickname: string) => void;
  className?: string;
}

export default function NicknameEditor({
  studentId,
  teacherId,
  currentNickname = '',
  studentName,
  onNicknameUpdate,
  className = ''
}: NicknameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(currentNickname);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (nickname.length > 50) {
      alert('Nickname không được quá 50 ký tự');
      return;
    }

    setIsLoading(true);
    try {
      const success = await setStudentNickname(teacherId, studentId, nickname);
      if (success) {
        onNicknameUpdate(studentId, nickname);
        setIsEditing(false);
      } else {
        alert('Có lỗi xảy ra khi cập nhật nickname');
      }
    } catch (error) {
      console.error('Error updating nickname:', error);
      alert('Có lỗi xảy ra khi cập nhật nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNickname(currentNickname);
    setIsEditing(false);
  };

  const displayName = currentNickname || studentName;

  if (isEditing) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={studentName}
          maxLength={50}
          className="px-2 py-1 border border-[#fc5d01] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#fc5d01] min-w-0 flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="text-green-600 hover:text-green-800 text-sm px-1"
          title="Lưu"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="text-red-600 hover:text-red-800 text-sm px-1"
          title="Hủy"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 group ${className}`}>
      <span className="flex-1 min-w-0">
        {displayName}
        {currentNickname && (
          <span className="text-xs text-gray-500 ml-1">({studentName})</span>
        )}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-[#fc5d01] hover:text-[#fd7f33] text-sm px-1 transition-opacity"
        title="Chỉnh sửa nickname"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  );
}
