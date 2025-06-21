'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Assignment } from '../../../types/assignment';
import { getAssignmentsByTeacher, deleteAssignment, gradeAssignment, updateAssignment } from '../../firebase/services/assignment';
import { getUserByEmail } from '../../firebase/services/user';

interface AssignmentManagementProps {
  onCreateNew?: () => void;
}

const AssignmentManagement: React.FC<AssignmentManagementProps> = ({ onCreateNew }) => {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [gradeData, setGradeData] = useState({
    studentId: '',
    studentName: '',
    grade: '',
    feedback: ''
  });
  const [editData, setEditData] = useState({
    title: '',
    instructions: '',
    dueDate: ''
  });

  useEffect(() => {
    loadAssignments();
  }, [session]);

  const loadAssignments = async () => {
    if (!session?.user?.email) return;

    try {
      const userDoc = await getUserByEmail(session.user.email);
      if (!userDoc) return;

      const userAssignments = await getAssignmentsByTeacher(userDoc.id);
      setAssignments(userAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;

    try {
      const success = await deleteAssignment(assignmentId);
      if (success) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        alert('Đã xóa bài tập thành công!');
      } else {
        alert('Không thể xóa bài tập');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Lỗi khi xóa bài tập');
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setEditData({
      title: assignment.title,
      instructions: assignment.instructions,
      dueDate: assignment.dueDate.split('T')[0] // Convert to YYYY-MM-DD format
    });
    setShowEditModal(true);
  };

  const submitEdit = async () => {
    if (!selectedAssignment) return;

    try {
      const success = await updateAssignment(selectedAssignment.id, editData);
      if (success) {
        alert('Đã cập nhật bài tập thành công!');
        setShowEditModal(false);
        loadAssignments(); // Reload to get updated data
      } else {
        alert('Không thể cập nhật bài tập');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Lỗi khi cập nhật bài tập');
    }
  };

  const handleGradeSubmission = (assignment: Assignment, studentId: string, studentName: string) => {
    setSelectedAssignment(assignment);
    setGradeData({
      studentId,
      studentName,
      grade: '',
      feedback: ''
    });
    setShowGradeModal(true);
  };

  const submitGrade = async () => {
    if (!selectedAssignment || !session?.user?.email) return;

    try {
      const userDoc = await getUserByEmail(session.user.email);
      if (!userDoc) return;

      const success = await gradeAssignment(
        selectedAssignment.id,
        gradeData.studentId,
        parseInt(gradeData.grade),
        gradeData.feedback,
        userDoc.id,
        userDoc.name || session.user.name || 'Unknown'
      );

      if (success) {
        alert('Đã chấm điểm thành công!');
        setShowGradeModal(false);
        loadAssignments(); // Reload to get updated data
      } else {
        alert('Không thể chấm điểm');
      }
    } catch (error) {
      console.error('Error grading assignment:', error);
      alert('Lỗi khi chấm điểm');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'graded': return 'text-green-600 bg-green-100';
      case 'late': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fc5d01' }}></div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff' }} className="p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ color: '#fc5d01' }} className="text-2xl font-bold">
          Quản Lý Bài Tập
        </h2>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            style={{ backgroundColor: '#fc5d01' }}
            className="text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            + Tạo Bài Tập Mới
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">Chưa có bài tập nào</p>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              style={{ backgroundColor: '#fc5d01' }}
              className="text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Tạo Bài Tập Đầu Tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map(assignment => (
            <div key={assignment.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#fc5d01' }}>
                    {assignment.title}
                  </h3>
                  <p className="text-gray-600 mb-2">{assignment.instructions}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Hạn nộp: {formatDate(assignment.dueDate)}</span>
                    <span>Tạo: {formatDate(assignment.createdAt)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                      {assignment.status === 'active' ? 'Đang hoạt động' : 
                       assignment.status === 'expired' ? 'Đã hết hạn' : 'Hoàn thành'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditAssignment(assignment)}
                    style={{ backgroundColor: '#fc5d01' }}
                    className="text-white px-3 py-1 rounded text-sm hover:bg-orange-600 transition-colors"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-300 hover:border-red-500 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {/* Submissions */}
              <div className="mt-4">
                <h4 className="font-medium mb-3" style={{ color: '#fc5d01' }}>
                  Bài nộp ({assignment.submissions.length}/{assignment.targetStudents.length})
                </h4>
                
                {assignment.submissions.length === 0 ? (
                  <p className="text-gray-500 text-sm">Chưa có học viên nào nộp bài</p>
                ) : (
                  <div className="space-y-3">
                    {assignment.submissions.map(submission => (
                      <div key={submission.studentId} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-medium">{submission.studentName}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubmissionStatusColor(submission.status)}`}>
                                {submission.status === 'submitted' ? 'Đã nộp' :
                                 submission.status === 'graded' ? 'Đã chấm' : 'Nộp muộn'}
                              </span>
                              {submission.grade && (
                                <span className="text-sm font-medium text-green-600">
                                  Điểm: {submission.grade}/100
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{submission.content}</p>
                            <p className="text-xs text-gray-500">
                              Nộp lúc: {formatDate(submission.submittedAt)}
                            </p>
                            {submission.feedback && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                <p className="text-sm"><strong>Nhận xét:</strong> {submission.feedback}</p>
                                {submission.gradedByName && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Chấm bởi: {submission.gradedByName}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          {submission.status !== 'graded' && (
                            <button
                              onClick={() => handleGradeSubmission(assignment, submission.studentId, submission.studentName)}
                              style={{ backgroundColor: '#fc5d01' }}
                              className="text-white px-3 py-1 rounded text-sm hover:bg-orange-600 transition-colors"
                            >
                              Chấm điểm
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#fc5d01' }}>
              Chấm điểm cho {gradeData.studentName}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Điểm (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeData.grade}
                  onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nhập điểm..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nhận xét</label>
                <textarea
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nhập nhận xét..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={submitGrade}
                disabled={!gradeData.grade}
                style={{ backgroundColor: '#fc5d01' }}
                className="flex-1 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Lưu điểm
              </button>
              <button
                onClick={() => setShowGradeModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#fc5d01' }}>
              Sửa bài tập: {selectedAssignment.title}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tiêu đề *</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nhập tiêu đề bài tập..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Hướng dẫn *</label>
                <textarea
                  value={editData.instructions}
                  onChange={(e) => setEditData(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nhập hướng dẫn chi tiết..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Hạn nộp *</label>
                <input
                  type="date"
                  value={editData.dueDate}
                  onChange={(e) => setEditData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={submitEdit}
                disabled={!editData.title || !editData.instructions || !editData.dueDate}
                style={{ backgroundColor: '#fc5d01' }}
                className="flex-1 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cập nhật
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentManagement;
