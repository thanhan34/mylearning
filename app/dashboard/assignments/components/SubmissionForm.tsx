"use client";

import { useState } from "react";
import { Assignment } from "../../../../types/assignment";
import { AssignmentSubmission } from "../../../../types/submission";
import { createSubmission } from "../../../firebase/services";

interface SubmissionFormProps {
  assignment: Assignment;
  studentId: string;
  onSuccess: (assignmentId: string, submission: AssignmentSubmission) => void;
  onCancel: () => void;
}

export default function SubmissionForm({ 
  assignment, 
  studentId, 
  onSuccess, 
  onCancel 
}: SubmissionFormProps) {
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const submissionId = await createSubmission(assignment.id, studentId, { link, notes });
      if (!submissionId) {
        throw new Error("Failed to create submission");
      }

      const submission: AssignmentSubmission = {
        id: submissionId,
        assignmentId: assignment.id,
        studentId,
        submittedAt: new Date().toISOString(),
        link,
        notes,
        status: "submitted"
      };

      onSuccess(assignment.id, submission);
    } catch (err) {
      setError("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
          Link bài làm
        </label>
        <input
          type="url"
          id="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#fc5d01] focus:border-[#fc5d01]"
          placeholder="https://..."
          required
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Ghi chú (không bắt buộc)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#fc5d01] focus:border-[#fc5d01]"
          rows={3}
          placeholder="Thêm ghi chú về bài làm của bạn..."
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
          disabled={isSubmitting}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang nộp..." : "Nộp bài"}
        </button>
      </div>
    </form>
  );
}
