"use client";

import { useState, useEffect } from "react";
import { Assignment } from "../../../../types/assignment";
import { AssignmentSubmission } from "../../../../types/submission";
import { getAssignmentSubmission, getDailySubmissionCount } from "../../../firebase/services";
import SubmissionForm from "./SubmissionForm";

interface SubmissionListProps {
  assignments: Assignment[];
  studentId: string;
}

export default function SubmissionList({ assignments, studentId }: SubmissionListProps) {
  const [submissions, setSubmissions] = useState<Record<string, AssignmentSubmission | null>>({});
  const [dailyCount, setDailyCount] = useState(0);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const loadSubmissions = async () => {
      const submissionData: Record<string, AssignmentSubmission | null> = {};
      for (const assignment of assignments) {
        const submission = await getAssignmentSubmission(assignment.id, studentId);
        submissionData[assignment.id] = submission;
      }
      setSubmissions(submissionData);

      const count = await getDailySubmissionCount(studentId);
      setDailyCount(count);
    };

    loadSubmissions();
  }, [assignments, studentId]);

  const handleSubmissionSuccess = async (assignmentId: string, submission: AssignmentSubmission) => {
    setSubmissions(prev => ({
      ...prev,
      [assignmentId]: submission
    }));
    setSelectedAssignment(null);
    setDailyCount(await getDailySubmissionCount(studentId));
  };

  return (
    <div>
      <div className="mb-4 p-4 bg-[#fedac2] rounded-lg">
        <p className="text-[#fc5d01]">Số bài tập đã nộp hôm nay: {dailyCount}</p>
      </div>

      <div className="space-y-4">
        {assignments.map(assignment => (
          <div 
            key={assignment.id} 
            className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-[#fc5d01]">{assignment.title}</h3>
                <p className="text-gray-600 mt-1">{assignment.instructions}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  submissions[assignment.id] 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {submissions[assignment.id] ? "Đã nộp" : "Chưa nộp"}
                </span>
                {!submissions[assignment.id] && (
                  <button
                    onClick={() => setSelectedAssignment(assignment)}
                    className="mt-2 text-[#fc5d01] hover:text-[#fd7f33]"
                  >
                    Nộp bài
                  </button>
                )}
              </div>
            </div>

            {submissions[assignment.id] && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Link bài nộp: <a href={submissions[assignment.id]?.link} target="_blank" rel="noopener noreferrer" className="text-[#fc5d01] hover:text-[#fd7f33]">{submissions[assignment.id]?.link}</a>
                </p>
                {submissions[assignment.id]?.notes && (
                  <p className="text-sm text-gray-600 mt-2">
                    Ghi chú: {submissions[assignment.id]?.notes}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Đã nộp lúc: {new Date(submissions[assignment.id]?.submittedAt || "").toLocaleString("vi-VN")}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4 text-[#fc5d01]">Nộp bài tập</h2>
            <SubmissionForm
              assignment={selectedAssignment}
              studentId={studentId}
              onSuccess={handleSubmissionSuccess}
              onCancel={() => setSelectedAssignment(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
