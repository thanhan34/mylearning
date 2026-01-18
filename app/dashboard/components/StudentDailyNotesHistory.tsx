'use client';

import { useState, useEffect } from 'react';
import { getStudentDailyNotes, DailyNote } from '@/app/firebase/services/daily-notes';

interface Props {
  studentId: string;
}

export default function StudentDailyNotesHistory({ studentId }: Props) {
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);
      try {
        const studentNotes = await getStudentDailyNotes(studentId, 90); // Load last 90 days
        setNotes(studentNotes);
      } catch (error) {
        console.error('Error loading daily notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [studentId]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-[#fc5d01] mb-6 text-center border-b-2 border-[#fc5d01] pb-4">
          📝 Nhật ký học tập
        </h2>
        <p className="text-gray-500 text-center py-8">
          Chưa có ghi chú nào từ giảng viên
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg" style={{ 
      minHeight: '842px', // A4 height approximation
      maxWidth: '794px', // A4 width approximation
      margin: '0 auto'
    }}>
      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-[#fc5d01]">
        <h2 className="text-3xl font-bold text-[#fc5d01] text-center">
          📚 Nhật ký học tập
        </h2>
        <p className="text-center text-gray-600 mt-2">
          Ghi chú từ giảng viên
        </p>
      </div>

      {/* Notes List */}
      <div className="space-y-8">
        {notes.map((note, index) => (
          <div key={note.id} className="border-l-4 border-[#fc5d01] pl-4 py-2">
            {/* Date Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#fc5d01] text-white px-3 py-1 rounded-full text-sm font-medium">
                {new Date(note.date).toLocaleDateString('vi-VN', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Note Content */}
            <div className="space-y-3 ml-2">
              {note.content && (
                <div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#fc5d01] font-semibold text-sm">📌</span>
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {note.whatLearned && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-semibold text-sm">✅</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-700 text-sm mb-1">Đã học được:</h4>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {note.whatLearned}
                      </p>
                    </div>
                  </div>
                </div>
              )}

                {note.whatToPractice && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-semibold text-sm">💡</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-700 text-sm mb-1">Cần luyện tập:</h4>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {note.whatToPractice}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Images */}
                {note.images && note.images.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#fc5d01] font-semibold text-sm">🖼️</span>
                      <h4 className="font-semibold text-gray-700 text-sm">Hình ảnh:</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                      {note.images.map((imageUrl, imgIndex) => (
                        <a
                          key={imgIndex}
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img
                            src={imageUrl}
                            alt={`Hình ảnh ${imgIndex + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-[#fc5d01] transition-colors cursor-pointer"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Separator */}
            {index < notes.length - 1 && (
              <div className="mt-6 border-b border-gray-200"></div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        Tổng số {notes.length} ghi chú
      </div>
    </div>
  );
}
