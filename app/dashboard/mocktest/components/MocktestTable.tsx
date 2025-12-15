"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Mocktest } from "../../../../types/mocktest";
import { deleteMocktest } from "../../../firebase/services/mocktest";
import MocktestForm from "./MocktestForm";
import TeacherFeedback from "./TeacherFeedback";

interface Props {
  mocktests: Mocktest[];
  classId: string;
  className?: string;
  isTeacher?: boolean;
  onUpdate: () => void;
}

export default function MocktestTable({
  mocktests,
  classId,
  className,
  isTeacher = false,
  onUpdate
}: Props) {
  const { data: session } = useSession();
  const [editingMocktest, setEditingMocktest] = useState<Mocktest | null>(null);
  const [addingFeedback, setAddingFeedback] = useState<Mocktest | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (mocktestId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mocktest này?")) return;
    
    try {
      await deleteMocktest(mocktestId);
      onUpdate();
    } catch (error) {
      console.error("Error deleting mocktest:", error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("vi-VN").format(date);
  };

  if (!mocktests) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-gray-500">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Tổng số bài mocktest: {mocktests.length}
        </div>
      </div>
      {!isTeacher && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#fd7f33] rounded-md hover:bg-[#fc5d01] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fc5d01]"
          >
            Thêm Mocktest
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <MocktestForm
            classId={classId}
            className={className}
            onSuccess={() => {
              setShowForm(false);
              onUpdate();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {editingMocktest && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <MocktestForm
            classId={classId}
            className={className}
            mocktestId={editingMocktest.id}
            initialData={{
              link: editingMocktest.link,
              submittedAt: editingMocktest.submittedAt.toDate(),
            }}
            onSuccess={() => {
              setEditingMocktest(null);
              onUpdate();
            }}
            onCancel={() => setEditingMocktest(null)}
          />
        </div>
      )}

      {addingFeedback && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <TeacherFeedback
            mocktestId={addingFeedback.id}
            studentName={addingFeedback.studentId}
            className={className}
            initialFeedback={addingFeedback.feedback}
            onSuccess={() => {
              setAddingFeedback(null);
              onUpdate();
            }}
            onCancel={() => setAddingFeedback(null)}
          />
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 transition-all duration-200 hover:shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-[#fedac2] to-[#ffac7b]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Ngày nộp
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mocktests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Chưa có bài mocktest nào
                </td>
              </tr>
            )}
            {mocktests.map((mocktest) => (
              <tr key={mocktest.id} className="hover:bg-[#fedac2]/20 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${mocktest.feedback ? 'bg-green-400' : 'bg-yellow-400'} mr-2`}></div>
                    <span className="text-sm text-gray-900">{formatDate(mocktest.submittedAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="group relative">
                    <div className="text-sm text-gray-900">
                      {mocktest.link.includes("APEUni Mock Test Result:") ? (
                        <div className="flex items-center">
                          <span className="mr-1">{mocktest.link.split("APEUni Mock Test Result:")[0]}APEUni Mock Test Result: </span>
                          <a 
                            href={mocktest.link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || mocktest.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[#fc5d01] hover:text-[#fd7f33] hover:underline flex items-center group-hover:opacity-75 transition-opacity duration-150"
                          >
                            <span className="truncate max-w-xs">{mocktest.link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || mocktest.link.split("APEUni Mock Test Result:")[1]}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      ) : mocktest.link.includes("shared a answer from PTE APEUni") ? (
                        <div className="flex items-center">
                          <span className="mr-1">{mocktest.link.split("https://")[0]}</span>
                          <a 
                            href={mocktest.link.match(/https:\/\/www\.apeuni\.com\/(en\/)?practice\/answer_item\?[^\s]+/)?.[0] || mocktest.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[#fc5d01] hover:text-[#fd7f33] hover:underline flex items-center group-hover:opacity-75 transition-opacity duration-150"
                          >
                            <span className="truncate max-w-xs">https://{mocktest.link.split("https://")[1]}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      ) : (
                        <a 
                          href={mocktest.link.match(/https:\/\/www\.apeuni\.com\/(en\/)?practice\/answer_item\?[^\s]+/)?.[0] || mocktest.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[#fc5d01] hover:text-[#fd7f33] hover:underline flex items-center group-hover:opacity-75 transition-opacity duration-150"
                        >
                          <span className="truncate max-w-xs">{mocktest.link}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <div className="hidden group-hover:block absolute z-10 p-2 bg-gray-800 text-white text-xs rounded mt-1 whitespace-nowrap">
                      Mở trong tab mới
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    {mocktest.feedback ? (
                      <div className="text-gray-900">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                          <span className="font-medium text-green-600">Đã có feedback</span>
                        </div>
                        <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-gray-600 whitespace-pre-wrap">{mocktest.feedback}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                        <span className="text-yellow-600">Chưa có feedback</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-3">
                    {isTeacher ? (
                      <button
                        onClick={() => setAddingFeedback(mocktest)}
                        className="inline-flex items-center px-3 py-1.5 border border-[#fc5d01] text-[#fc5d01] hover:bg-[#fc5d01] hover:text-white rounded-md transition-all duration-200 hover:shadow-md active:transform active:scale-95"
                      >
                        {mocktest.feedback ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Sửa feedback</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Thêm feedback</span>
                          </>
                        )}
                      </button>
                    ) : (
                      session?.user?.id === mocktest.studentId && (
                        <>
                          <button
                            onClick={() => setEditingMocktest(mocktest)}
                        className="inline-flex items-center px-3 py-1.5 border border-[#fc5d01] text-[#fc5d01] hover:bg-[#fc5d01] hover:text-white rounded-md transition-all duration-200 hover:shadow-md active:transform active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Sửa</span>
                          </button>
                          <button
                            onClick={() => handleDelete(mocktest.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-600 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-200 hover:shadow-md active:transform active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Xóa</span>
                          </button>
                        </>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
