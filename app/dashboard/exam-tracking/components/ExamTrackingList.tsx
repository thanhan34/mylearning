"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ExamTrackingInfo } from "@/types/exam-tracking";
import { getAllExamInfo, deletePastExamRecords } from "@/app/firebase/services/exam-tracking";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { UserProfile } from "@/types/profile";
import AdminExamTrackingForm from "./AdminExamTrackingForm";

export default function ExamTrackingList() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [examInfoList, setExamInfoList] = useState<ExamTrackingInfo[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamTrackingInfo | null>(null);

  const isAdmin = session?.user?.role === "admin";
  const isTeacher = session?.user?.role === "teacher";

  const fetchExamInfo = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      let examInfo;
      if (isAdmin) {
        examInfo = await getAllExamInfo();
        setExamInfoList(examInfo);
      } else if (isTeacher && session.user.name) {
        // Get teacher's info first
        const usersRef = collection(db, 'users');
        const teacherQuery = query(usersRef, where('email', '==', session.user.email));
        const teacherSnapshot = await getDocs(teacherQuery);
        
        if (!teacherSnapshot.empty) {
          const teacherDoc = teacherSnapshot.docs[0];
          const teacherId = teacherDoc.id;
          const teacherData = teacherDoc.data() as UserProfile;
          
          // Get teacher's classes
          const classesRef = collection(db, 'classes');
          const classQuery = query(classesRef, where('teacherId', '==', teacherId));
          const classSnapshot = await getDocs(classQuery);
          
          const teacherClassNames = classSnapshot.docs.map(doc => doc.data().name);
          
          // Get all exam info and filter by class names
          const allExamInfo = await getAllExamInfo();
          
          const teacherStudentsInfo = allExamInfo.filter(info => {
            return teacherClassNames.includes(info.className);
          });
          
          setExamInfoList(teacherStudentsInfo);
        }
      }
    } catch (error) {
      console.error("Error fetching exam info:", error);
    } finally {
      setLoading(false);
    }
  }, [session, isAdmin, isTeacher]);

  useEffect(() => {
    fetchExamInfo();
  }, [fetchExamInfo]);

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingExam(null);
    fetchExamInfo();
  };

  const handleEditExam = (exam: ExamTrackingInfo) => {
    setEditingExam(exam);
    setShowAddForm(true);
  };

  // Filter future dates and sort them
  const futureExams = examInfoList
    .filter(info => {
      const examDate = new Date(info.examDate);
      examDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return examDate >= today;
    })
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!isAdmin && !isTeacher) {
    return <div className="text-center">Access denied</div>;
  }

  if (showAddForm) {
    return (
      <AdminExamTrackingForm 
        onClose={handleFormClose} 
        existingExam={editingExam}
      />
    );
  }

  return (
    <>
      <div className="max-w-full mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[#fc5d01] p-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">
                {isAdmin ? "All Students Exam Information" : "Your Students Exam Information"}
              </h1>
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingExam(null);
                      setShowAddForm(true);
                    }}
                    className="bg-white text-[#fc5d01] font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2 hover:bg-[#fedac2]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Exam
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={deleteLoading}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    {deleteLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Past Records
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full table-auto divide-y divide-gray-200">
                <thead>
                  <tr className="bg-[#fedac2]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Target Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Exam Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Exam Date
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {futureExams.map((info, index) => (
                    <tr
                      key={info.id}
                      className={index % 2 === 0 ? "bg-white hover:bg-[#fff8f5]" : "bg-[#fff8f5] hover:bg-[#fedac2]/20"}
                    >
                      <td className="px-6 py-4">{info.name}</td>
                      <td className="px-6 py-4">{info.email}</td>
                      <td className="px-6 py-4">{info.target}</td>
                      <td className="px-6 py-4">{info.className}</td>
                      <td className="px-6 py-4">{info.teacherName}</td>
                      <td className="px-6 py-4">{info.examLocation}</td>
                      <td className="px-6 py-4">
                        {new Date(info.examDate).toLocaleDateString('en-GB')}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleEditExam(info)}
                            className="text-[#fc5d01] hover:text-[#fd7f33] transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {futureExams.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="px-6 py-4 text-center text-gray-500">
                        No upcoming exam information found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full mx-4">
            <div className="bg-[#fc5d01] p-4">
              <div className="flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Delete Past Exam Records?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  This will permanently delete all exam records with dates before today. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setDeleteLoading(true);
                        await deletePastExamRecords();
                        // Refresh the list
                        const examInfo = await getAllExamInfo();
                        setExamInfoList(examInfo);
                        setShowConfirmDelete(false);
                      } catch (error) {
                        console.error("Error deleting past records:", error);
                        alert("Error deleting past records. Please try again.");
                      } finally {
                        setDeleteLoading(false);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
