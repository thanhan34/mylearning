'use client';

import { useState, useEffect } from 'react';
import { getDailyNote, saveDailyNote, DailyNote } from '@/app/firebase/services/daily-notes';
import { useSession } from 'next-auth/react';

interface Props {
  studentId: string;
  studentName: string;
  selectedDate: string;
}

export default function StudentDailyNotes({ studentId, studentName, selectedDate }: Props) {
  const { data: session } = useSession();
  const [note, setNote] = useState<DailyNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    whatLearned: '',
    whatToPractice: ''
  });

  // Load note for selected date
  useEffect(() => {
    const loadNote = async () => {
      setLoading(true);
      try {
        const dailyNote = await getDailyNote(studentId, selectedDate);
        setNote(dailyNote);
        
        if (dailyNote) {
          setFormData({
            content: dailyNote.content || '',
            whatLearned: dailyNote.whatLearned || '',
            whatToPractice: dailyNote.whatToPractice || ''
          });
        } else {
          setFormData({
            content: '',
            whatLearned: '',
            whatToPractice: ''
          });
        }
      } catch (error) {
        console.error('Error loading daily note:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [studentId, selectedDate]);

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const success = await saveDailyNote(
        studentId,
        studentName,
        session.user.id,
        selectedDate,
        formData.content,
        formData.whatLearned,
        formData.whatToPractice
      );

      if (success) {
        // Reload note to get updated data
        const updatedNote = await getDailyNote(studentId, selectedDate);
        setNote(updatedNote);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving daily note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (note) {
      setFormData({
        content: note.content || '',
        whatLearned: note.whatLearned || '',
        whatToPractice: note.whatToPractice || ''
      });
    } else {
      setFormData({
        content: '',
        whatLearned: '',
        whatToPractice: ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#fc5d01]">
          Ghi chú học tập - {new Date(selectedDate).toLocaleDateString('vi-VN')}
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] text-sm"
          >
            {note ? 'Chỉnh sửa' : 'Thêm ghi chú'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú chung
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
              rows={3}
              placeholder="Ghi chú chung về buổi học..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Học được gì
            </label>
            <textarea
              value={formData.whatLearned}
              onChange={(e) => setFormData({ ...formData, whatLearned: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
              rows={3}
              placeholder="Học viên đã học được những gì trong buổi này..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cần luyện tập gì
            </label>
            <textarea
              value={formData.whatToPractice}
              onChange={(e) => setFormData({ ...formData, whatToPractice: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
              rows={3}
              placeholder="Những điều học viên cần luyện tập thêm..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!note ? (
            <p className="text-gray-500 text-center py-4">
              Chưa có ghi chú cho ngày này
            </p>
          ) : (
            <>
              {note.content && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Ghi chú chung:</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{note.content}</p>
                </div>
              )}

              {note.whatLearned && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Học được gì:</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{note.whatLearned}</p>
                </div>
              )}

              {note.whatToPractice && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Cần luyện tập gì:</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{note.whatToPractice}</p>
                </div>
              )}

              {note.updatedAt && (
                <p className="text-xs text-gray-400 mt-4">
                  Cập nhật lần cuối: {new Date(note.updatedAt).toLocaleString('vi-VN')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
