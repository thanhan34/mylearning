'use client';

import { useState, useEffect } from 'react';
import { getStudentDailyNotes, saveDailyNote, DailyNote } from '@/app/firebase/services/daily-notes';
import { useSession } from 'next-auth/react';

interface Props {
  studentId: string;
  studentName: string;
}

export default function TeacherDailyNotesManager({ studentId, studentName }: Props) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    content: '',
    whatLearned: '',
    whatToPractice: ''
  });

  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);
      try {
        const studentNotes = await getStudentDailyNotes(studentId, 365); // Load last year
        setNotes(studentNotes);
      } catch (error) {
        console.error('Error loading daily notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [studentId]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    if (!formData.content && !formData.whatLearned && !formData.whatToPractice) {
      alert('Vui lòng nhập ít nhất một trường');
      return;
    }

    setSaving(true);
    try {
      // Use editingNoteId's date if editing, otherwise use today
      const dateToSave = editingNoteId ? formData.date : new Date().toISOString().split('T')[0];
      
      const success = await saveDailyNote(
        studentId,
        studentName,
        session.user.id,
        dateToSave,
        formData.content,
        formData.whatLearned,
        formData.whatToPractice
      );

      if (success) {
        // Reload notes
        const updatedNotes = await getStudentDailyNotes(studentId, 365);
        setNotes(updatedNotes);
        
        // Reset form
        setFormData({
          date: '',
          content: '',
          whatLearned: '',
          whatToPractice: ''
        });
        setShowForm(false);
        setEditingNoteId(null);
      }
    } catch (error) {
      console.error('Error saving daily note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note: DailyNote) => {
    setFormData({
      date: note.date,
      content: note.content || '',
      whatLearned: note.whatLearned || '',
      whatToPractice: note.whatToPractice || ''
    });
    setEditingNoteId(note.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg" style={{ 
      minHeight: '842px',
      maxWidth: '794px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-[#fc5d01]">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#fc5d01]">
              📚 Nhật ký học tập
            </h2>
            <p className="text-gray-600 mt-2">
              Học viên: <span className="font-semibold">{studentName}</span>
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] text-sm font-medium"
            >
              ➕ Thêm ghi chú hôm nay
            </button>
          )}
        </div>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="mb-8 p-6 border-2 border-[#fc5d01] rounded-lg bg-[#fedac2]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#fc5d01]">
              {editingNoteId 
                ? `✏️ Chỉnh sửa ghi chú - ${new Date(formData.date).toLocaleDateString('vi-VN')}` 
                : `➕ Ghi chú mới - ${new Date().toLocaleDateString('vi-VN')}`
              }
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingNoteId(null);
                setFormData({ date: '', content: '', whatLearned: '', whatToPractice: '' });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📌 Ghi chú chung
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
                rows={3}
                placeholder="Ghi chú chung về buổi học hôm nay..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ✅ Học được gì
              </label>
              <textarea
                value={formData.whatLearned}
                onChange={(e) => setFormData({ ...formData, whatLearned: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
                rows={3}
                placeholder="Học viên đã học được những gì..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💡 Cần luyện tập gì
              </label>
              <textarea
                value={formData.whatToPractice}
                onChange={(e) => setFormData({ ...formData, whatToPractice: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
                rows={3}
                placeholder="Những điều học viên cần luyện tập thêm..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({ date: '', content: '', whatLearned: '', whatToPractice: '' });
                }}
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
                {saving ? 'Đang lưu...' : '💾 Lưu ghi chú'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Chưa có ghi chú nào. Hãy thêm ghi chú đầu tiên!
        </p>
      ) : (
        <div className="space-y-8">
          {notes.map((note, index) => (
            <div key={note.id} className="border-l-4 border-[#fc5d01] pl-4 py-2">
              {/* Date Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="bg-[#fc5d01] text-white px-3 py-1 rounded-full text-sm font-medium">
                  {new Date(note.date).toLocaleDateString('vi-VN', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => handleEdit(note)}
                  className="px-3 py-1 text-sm text-[#fc5d01] hover:bg-[#fedac2] rounded-lg transition-colors"
                >
                  ✏️ Chỉnh sửa
                </button>
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
              </div>

              {/* Separator */}
              {index < notes.length - 1 && (
                <div className="mt-6 border-b border-gray-200"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        Tổng số {notes.length} ghi chú
      </div>
    </div>
  );
}
