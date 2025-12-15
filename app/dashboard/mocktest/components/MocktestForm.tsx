"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MocktestFormData } from "../../../../types/mocktest";
import { addMocktest, updateMocktest } from "../../../firebase/services/mocktest";

interface Props {
  classId: string;
  className?: string;
  initialData?: MocktestFormData;
  mocktestId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MocktestForm({ 
  classId,
  className,
  initialData, 
  mocktestId,
  onSuccess, 
  onCancel 
}: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<MocktestFormData>(
    initialData || {
      link: "",
      submittedAt: new Date(),
    }
  );

  const validateLink = (link: string): boolean => {
    // Regular link format
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return true;
    }

    // APEUni format
    const apeuniPattern = /^.+'s APEUni Mock Test Result: https:\/\/www\.apeuni\.com\/.+$/;
    
    // Mobile APEUni format
    const mobileApeuniPattern = /^[A-Z]+#\d+ shared a answer from PTE APEUni[\s\S]*https:\/\/www\.apeuni\.com\/(en\/)?practice\/answer_item\?.+$/;
    
    return apeuniPattern.test(link) || mobileApeuniPattern.test(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    // Validate link format
    if (!validateLink(formData.link)) {
      setError("Link không hợp lệ. Vui lòng nhập đúng định dạng.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Submitting mocktest:", {
        userId: session.user.id,
        classId,
        formData
      });
      
      if (mocktestId) {
        await updateMocktest(mocktestId, formData);
        alert("Mocktest đã được cập nhật thành công!");
      } else {
        await addMocktest(
          session.user.id, 
          classId, 
          formData,
          session.user.name || session.user.email || 'Học viên',
          className
        );
        alert("Mocktest đã được thêm thành công!");
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving mocktest:", error);
      setError("Có lỗi xảy ra khi lưu mocktest. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#fedac2]/20 p-4 rounded-lg border border-[#fedac2]">
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {mocktestId ? "Cập nhật Mocktest" : "Thêm Mocktest mới"}
        </h3>
        <p className="text-sm text-gray-600">
          Điền thông tin mocktest của bạn vào form bên dưới
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label 
            htmlFor="link" 
            className="block text-sm font-medium text-gray-700"
          >
            Link bài Mocktest
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <input
              type="text"
              id="link"
              required
              value={formData.link}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, link: e.target.value }));
                setError("");
              }}
              className={`pl-10 block w-full rounded-md border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01] transition-colors duration-200`}
              placeholder="https://... hoặc [Tên]'s APEUni Mock Test Result: https://... hoặc RA#338 shared a answer from PTE APEUni..."
            />
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-500">
              Chấp nhận các định dạng:
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside pl-1 space-y-1">
              <li>Link thông thường (Google Drive, v.v.)</li>
              <li>Link APEUni theo định dạng: "Tên học viên's APEUni Mock Test Result: https://www.apeuni.com/..."</li>
              <li>Link APEUni từ điện thoại: "RA#338 shared a answer from PTE APEUni APEUni AI Score 67/90 https://www.apeuni.com/en/practice/answer_item?..."</li>
            </ul>
          </div>
        </div>

        <div>
          <label 
            htmlFor="submittedAt" 
            className="block text-sm font-medium text-gray-700"
          >
            Ngày nộp
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              id="submittedAt"
              required
              value={formData.submittedAt.toISOString().split("T")[0]}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                submittedAt: new Date(e.target.value) 
              }))}
              className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01] transition-colors duration-200"
            />
          </div>
        </div>
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
              {mocktestId ? "Cập nhật" : "Thêm mới"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
