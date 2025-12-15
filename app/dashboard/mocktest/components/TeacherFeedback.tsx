"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FeedbackFormData } from "../../../../types/mocktest";
import { addFeedback } from "../../../firebase/services/mocktest";

interface Props {
  mocktestId: string;
  studentName?: string;
  className?: string;
  initialFeedback?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TeacherFeedback({
  mocktestId,
  studentName,
  className,
  initialFeedback = "",
  onSuccess,
  onCancel
}: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FeedbackFormData>({
    feedback: initialFeedback
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      await addFeedback(
        mocktestId, 
        session.user.id, 
        formData,
        session.user.name || session.user.email || 'Giảng viên',
        studentName,
        className
      );
      onSuccess();
    } catch (error) {
      console.error("Error saving feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#fedac2]/20 p-4 rounded-lg border border-[#fedac2]">
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {initialFeedback ? "Cập nhật Feedback" : "Thêm Feedback"}
        </h3>
        <p className="text-sm text-gray-600">
          Nhập feedback của bạn cho bài mocktest này
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center">
          <label
            htmlFor="feedback"
            className="block text-sm font-medium text-gray-700"
          >
            Nội dung Feedback
          </label>
          <span className="text-sm text-gray-500">
            {formData.feedback.length} ký tự
          </span>
        </div>
        <div className="mt-1 relative rounded-md shadow-sm">
          <textarea
            id="feedback"
            rows={6}
            required
            value={formData.feedback}
            onChange={(e) => setFormData({ feedback: e.target.value })}
            className="block w-full rounded-md border border-gray-300 px-4 py-3 focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01] transition-colors duration-200 placeholder-gray-400 resize-none"
            placeholder="Nhập feedback chi tiết cho học sinh..."
          />
          <div className="absolute top-2 right-2">
            <div className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-gray-500">
          Viết feedback rõ ràng và chi tiết để học sinh có thể hiểu và cải thiện
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fc5d01] transition-colors duration-200 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#fd7f33] rounded-md hover:bg-[#fc5d01] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fc5d01] transition-all duration-200 disabled:opacity-50 hover:shadow-md active:transform active:scale-95"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang lưu...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {initialFeedback ? "Cập nhật" : "Lưu feedback"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
