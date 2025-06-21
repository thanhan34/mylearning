'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Assignment } from '../../../types/assignment';
import { getAssignmentsByStudent } from '../../firebase/services/assignment';
import { getUserByEmail } from '../../firebase/services/user';

const StudentAssignmentView: React.FC = () => {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [session]);

  const loadAssignments = async () => {
    if (!session?.user?.email) return;

    try {
      const userDoc = await getUserByEmail(session.user.email);
      if (!userDoc) return;

      console.log('Loading assignments for student:', userDoc.id);
      const userAssignments = await getAssignmentsByStudent(userDoc.id);
      console.log('Found assignments:', userAssignments);
      setAssignments(userAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
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

  const isOverdue = (dueDate: string) => {
    return new Date() > new Date(dueDate);
  };

  const getMySubmission = (assignment: Assignment) => {
    if (!session?.user?.email) return null;
    
    return assignment.submissions.find(sub => {
      // Try to match by student ID first, then by email or name
      return sub.studentId === session.user?.email?.replace(/[.#$[\]]/g, '_') ||
             sub.studentName === session.user?.name;
    });
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
      <h2 style={{ color: '#fc5d01' }} className="text-2xl font-bold mb-6">
        Bài Tập Được Giao
      </h2>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Chưa có bài tập nào được giao</p>
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map(assignment => {
            const mySubmission = getMySubmission(assignment);
            const overdue = isOverdue(assignment.dueDate);

            return (
              <div key={assignment.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2" style={{ color: '#fc5d01' }}>
                      {assignment.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{assignment.instructions}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>Giao bởi: {assignment.assignedByName}</span>
                      <span>Hạn nộp: {formatDate(assignment.dueDate)}</span>
                      {overdue && !mySubmission && (
                        <span className="text-red-600 font-medium">Đã quá hạn</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {assignment.status === 'active' ? 'Đang hoạt động' : 
                         assignment.status === 'expired' ? 'Đã hết hạn' : 'Hoàn thành'}
                      </span>
                      
                      {mySubmission && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubmissionStatusColor(mySubmission.status)}`}>
                          {mySubmission.status === 'submitted' ? 'Đã nộp' :
                           mySubmission.status === 'graded' ? 'Đã chấm' : 'Nộp muộn'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* My Submission */}
                {mySubmission && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2" style={{ color: '#fc5d01' }}>
                      Bài nộp của bạn
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-2">{mySubmission.content}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Nộp lúc: {formatDate(mySubmission.submittedAt)}
                    </p>

                    {mySubmission.grade !== undefined && (
                      <div className="mt-3 p-3 bg-green-50 rounded border-l-4 border-green-400">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-green-800">Điểm số</span>
                          <span className="text-lg font-bold text-green-600">
                            {mySubmission.grade}/100
                          </span>
                        </div>
                        
                        {mySubmission.feedback && (
                          <div className="mt-2">
                            <p className="text-sm text-green-700">
                              <strong>Nhận xét:</strong> {mySubmission.feedback}
                            </p>
                          </div>
                        )}
                        
                        {mySubmission.gradedByName && (
                          <p className="text-xs text-green-600 mt-2">
                            Chấm bởi: {mySubmission.gradedByName} • {formatDate(mySubmission.gradedAt || '')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentView;
