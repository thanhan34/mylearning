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
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const assignmentTypes = [
    "Bài tập về nhà",
    "Bài tập trên lớp",
    "Bài tập thực hành",
    "Dự án",
    "Khác"
  ];

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

  const filteredSubmissions = Object.values(submissions)
    .filter((submission): submission is AssignmentSubmission => 
      submission !== null &&
      (selectedType === "" || submission.type === selectedType) &&
      (selectedDate === "" || submission.date === selectedDate)
    );

  const groupedSubmissions = filteredSubmissions.reduce((groups, submission) => {
    const date = submission.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(submission);
    return groups;
  }, {} as Record<string, AssignmentSubmission[]>);

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-[#fedac2] rounded-lg">
          <p className="text-[#fc5d01]">Số bài tập đã nộp hôm nay: {dailyCount}</p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Loại bài tập
            </label>
            <select
              id="type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#fc5d01] focus:border-[#fc5d01]"
            >
              <option value="">Tất cả</option>
              {assignmentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Ngày nộp
            </label>
            <input
              type="date"
              id="date-filter"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#fc5d01] focus:border-[#fc5d01]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedSubmissions).map(([date, dateSubmissions]) => (
          <div key={date} className="space-y-4">
            <h3 className="text-lg font-semibold text-[#fc5d01]">
              {new Date(date).toLocaleDateString("vi-VN")}
            </h3>
            {dateSubmissions.map(submission => {
              const assignment = assignments.find(a => a.id === submission.assignmentId);
              if (!assignment) return null;
              return (
                <div 
                  key={`${submission.type}_${submission.questionNumber}_${submission.date}`} 
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-semibold text-[#fc5d01]">{assignment.title}</h4>
                      <p className="text-gray-600 mt-1">{assignment.instructions}</p>
                      <div className="flex gap-4 mt-2">
                        <p className="text-sm text-gray-500">
                          Loại: <span className="font-medium">{submission.type}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                      Đã nộp
                    </span>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Link bài nộp: <a 
                        href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#fc5d01] hover:text-[#fd7f33] break-all"
                        title="Click để mở link gốc"
                      >
                        {submission.link.split('https://')[0].trim()}
                      </a>
                    </p>
                    {submission.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        Ghi chú: {submission.notes}
                      </p>
                    )}
                    {submission.feedback ? (
                      <div className="mt-4 p-3 bg-[#fedac2] rounded">
                        <p className="text-sm">
                          <span className="font-medium text-[#fc5d01]">Feedback từ giáo viên:</span>{' '}
                          <span className="text-gray-700">{submission.feedback}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-4 italic">
                        Chưa có feedback từ giáo viên
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-4">
                      Đã nộp lúc: {new Date(submission.submittedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {Object.keys(groupedSubmissions).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Không có bài nộp nào {selectedType && `loại "${selectedType}"`} {selectedDate && `vào ngày ${new Date(selectedDate).toLocaleDateString("vi-VN")}`}
          </div>
        )}

        {assignments.filter(assignment => !submissions[assignment.id]).map(assignment => (
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
                <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                  Chưa nộp
                </span>
                <button
                  onClick={() => setSelectedAssignment(assignment)}
                  className="mt-2 text-[#fc5d01] hover:text-[#fd7f33]"
                >
                  Nộp bài
                </button>
              </div>
            </div>
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
