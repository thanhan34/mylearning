'use client';

import { useState, useEffect } from 'react';
import { getDailyNote, DailyNote } from '@/app/firebase/services/daily-notes';

interface Props {
  studentId: string;
  selectedDate: string;
}

export default function StudentDailyNotesView({ studentId, selectedDate }: Props) {
  const [note, setNote] = useState<DailyNote | null>(null);
  const [loading, setLoading] = useState(true);

  // Load note for selected date
  useEffect(() => {
    const loadNote = async () => {
      setLoading(true);
      try {
        const dailyNote = await getDailyNote(studentId, selectedDate);
        setNote(dailyNote);
      } catch (error) {
        console.error('Error loading daily note:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [studentId, selectedDate]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-[#fc5d01] mb-4">
          Ghi chú từ giảng viên - {new Date(selectedDate).toLocaleDateString('vi-VN')}
        </h3>
        <p className="text-gray-500 text-center py-4">
          Giảng viên chưa có ghi chú cho ngày này
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-[#fc5d01] mb-4">
        Ghi chú từ giảng viên - {new Date(selectedDate).toLocaleDateString('vi-VN')}
      </h3>

      <div className="space-y-4">
        {note.content && (
          <div className="bg-[#fedac2] p-4 rounded-lg">
            <h4 className="font-medium text-[#fc5d01] mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ghi chú chung:
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
          </div>
        )}

        {note.whatLearned && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-700 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Bạn đã học được:
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">{note.whatLearned}</p>
          </div>
        )}

        {note.whatToPractice && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-700 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Cần luyện tập thêm:
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">{note.whatToPractice}</p>
          </div>
        )}

        {note.updatedAt && (
          <p className="text-xs text-gray-400 text-right mt-4">
            Cập nhật: {new Date(note.updatedAt).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
}
