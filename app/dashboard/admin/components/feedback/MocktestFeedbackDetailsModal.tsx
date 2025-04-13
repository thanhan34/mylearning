'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Mocktest } from '@/types/mocktest';

interface MocktestFeedbackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mocktest: Mocktest & { 
    studentName: string;
    className: string;
    teacherName: string;
  } | null;
  formatDate: (date: Date) => string;
}

export default function MocktestFeedbackDetailsModal({
  isOpen,
  onClose,
  mocktest,
  formatDate
}: MocktestFeedbackDetailsModalProps) {
  if (!isOpen || !mocktest) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white">
          <h3 className="text-xl font-semibold">Chi tiết Feedback Mocktest</h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Student and Teacher Info */}
        <div className="px-6 py-4 bg-[#fedac2]/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Học viên</p>
              <p className="font-medium">{mocktest.studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Giảng viên</p>
              <p className="font-medium">{mocktest.teacherName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lớp học</p>
              <p className="font-medium">{mocktest.className}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ngày nộp</p>
              <p className="font-medium">{formatDate(mocktest.submittedAt.toDate())}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trạng thái</p>
              <p className={`font-medium ${mocktest.feedback ? 'text-green-600' : 'text-yellow-600'}`}>
                {mocktest.feedback ? 'Đã có feedback' : 'Chưa có feedback'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Mocktest Content and Feedback */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Mocktest Content */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="font-medium">Nội dung bài làm</h4>
              </div>
              
              <div className="p-4">
                {mocktest.link ? (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <a 
                      href={mocktest.link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || mocktest.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {mocktest.link}
                    </a>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-500 italic">
                    Không có nội dung
                  </div>
                )}
              </div>
            </div>
            
            {/* Feedback */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="font-medium">Feedback của giảng viên</h4>
              </div>
              
              <div className="p-4">
                <div className={`p-3 rounded border whitespace-pre-wrap ${
                  mocktest.feedback ? 'bg-[#fedac2]/20 border-[#fc5d01]/20' : 'bg-gray-50 border-gray-200'
                }`}>
                  {mocktest.feedback ? (
                    <p>{mocktest.feedback}</p>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có feedback</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
