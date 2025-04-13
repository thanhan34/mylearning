'use client';

import { useState, useEffect } from 'react';
import { HomeworkSubmission } from '@/app/firebase/services/types';

interface FeedbackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  teacherName: string;
  className: string;
  date: string;
  submissions: HomeworkSubmission[];
}

export default function FeedbackDetailsModal({
  isOpen,
  onClose,
  studentName,
  teacherName,
  className,
  date,
  submissions
}: FeedbackDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white">
          <h3 className="text-xl font-semibold">Chi tiết Feedback</h3>
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
              <p className="font-medium">{studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Giảng viên</p>
              <p className="font-medium">{teacherName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lớp học</p>
              <p className="font-medium">{className}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ngày nộp</p>
              <p className="font-medium">{date}</p>
            </div>
          </div>
        </div>
        
        {/* Submissions and Feedback */}
        <div className="flex-1 overflow-y-auto p-6">
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Không có bài tập nào
            </div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium">Bài tập #{index + 1}</h4>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Nội dung bài tập</h5>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                        {submission.link ? (
                          <a 
                            href={submission.link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || submission.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {submission.link}
                          </a>
                        ) : (
                          <span className="text-gray-500 italic">Không có nội dung</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Feedback của giảng viên</h5>
                      <div className={`p-3 rounded border whitespace-pre-wrap ${
                        submission.feedback ? 'bg-[#fedac2]/20 border-[#fc5d01]/20' : 'bg-gray-50 border-gray-200'
                      }`}>
                        {submission.feedback ? (
                          <p>{submission.feedback}</p>
                        ) : (
                          <p className="text-gray-500 italic">Chưa có feedback</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
