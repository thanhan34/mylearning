'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AssignmentFormData, CreateAssignmentData } from '../../../types/assignment';
import { createAssignment, getTargetStudents } from '../../firebase/services/assignment';
import { getTeacherClasses, getAssistantClasses } from '../../firebase/services/class';
import { getUserByEmail } from '../../firebase/services/user';
import { Class, ClassStudent } from '../../firebase/services/types';

interface AssignmentCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AssignmentCreationForm: React.FC<AssignmentCreationFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    instructions: '',
    dueDate: '',
    targetType: 'class',
    targetId: ''
  });

  useEffect(() => {
    loadClasses();
  }, [session]);

  const loadClasses = async () => {
    if (!session?.user?.email) return;

    try {
      const userDoc = await getUserByEmail(session.user.email);
      if (!userDoc) return;

      let userClasses: Class[] = [];
      if (userDoc.role === 'teacher') {
        userClasses = await getTeacherClasses(session.user.email);
      } else if (userDoc.role === 'assistant') {
        userClasses = await getAssistantClasses(session.user.email);
      }

      setClasses(userClasses);
      if (userClasses.length > 0) {
        setSelectedClass(userClasses[0]);
        setFormData(prev => ({
          ...prev,
          targetId: userClasses[0].id
        }));
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTargetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetType = e.target.value as 'class' | 'individual';
    setFormData(prev => ({
      ...prev,
      targetType,
      targetId: targetType === 'class' ? (selectedClass?.id || '') : ''
    }));
    setSelectedStudents([]);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const selectedClassData = classes.find(c => c.id === classId);
    setSelectedClass(selectedClassData || null);
    setFormData(prev => ({
      ...prev,
      targetId: classId
    }));
    setSelectedStudents([]);
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;

    setLoading(true);
    try {
      const userDoc = await getUserByEmail(session.user.email);
      if (!userDoc) {
        throw new Error('User not found');
      }

      // Get target students
      let targetStudents: string[] = [];
      if (formData.targetType === 'class') {
        targetStudents = await getTargetStudents('class', formData.targetId);
      } else {
        targetStudents = selectedStudents;
      }

      if (targetStudents.length === 0) {
        alert('Please select at least one student or class');
        return;
      }

      const assignmentData: CreateAssignmentData = {
        title: formData.title,
        instructions: formData.instructions,
        dueDate: formData.dueDate,
        assignedBy: userDoc.id,
        assignedByName: userDoc.name || session.user.name || 'Unknown',
        assignedByRole: userDoc.role as 'teacher' | 'assistant',
        targetType: formData.targetType,
        targetId: formData.targetId,
        targetStudents
      };

      const assignmentId = await createAssignment(assignmentData);
      if (assignmentId) {
        alert('Assignment created successfully!');
        // Reset form
        setFormData({
          title: '',
          instructions: '',
          dueDate: '',
          targetType: 'class',
          targetId: selectedClass?.id || ''
        });
        setSelectedStudents([]);
        onSuccess?.();
      } else {
        alert('Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Error creating assignment');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div style={{ backgroundColor: '#ffffff' }} className="p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 style={{ color: '#fc5d01' }} className="text-2xl font-bold mb-6">
        Tạo Bài Tập Mới
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#fc5d01' }}>
            Tiêu đề bài tập *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Nhập tiêu đề bài tập..."
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#fc5d01' }}>
            Hướng dẫn *
          </label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            required
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Nhập hướng dẫn chi tiết cho bài tập..."
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#fc5d01' }}>
            Hạn nộp *
          </label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            min={getMinDate()}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Target Type */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#fc5d01' }}>
            Giao cho *
          </label>
          <select
            name="targetType"
            value={formData.targetType}
            onChange={handleTargetTypeChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="class">Cả lớp</option>
            <option value="individual">Học viên cụ thể</option>
          </select>
        </div>

        {/* Class Selection */}
        {formData.targetType === 'class' && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#fc5d01' }}>
              Chọn lớp *
            </label>
            <select
              value={formData.targetId}
              onChange={handleClassChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Chọn lớp...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.students.length} học viên)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Individual Student Selection */}
        {formData.targetType === 'individual' && selectedClass && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#fc5d01' }}>
              Chọn học viên *
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {selectedClass.students.map(student => (
                <label key={student.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm">{student.name}</span>
                </label>
              ))}
            </div>
            {selectedStudents.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Đã chọn {selectedStudents.length} học viên
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#fc5d01' }}
            className="flex-1 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Đang tạo...' : 'Tạo Bài Tập'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Hủy
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AssignmentCreationForm;
