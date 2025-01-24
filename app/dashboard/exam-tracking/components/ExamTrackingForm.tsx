"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ExamTrackingFormData, ExamTrackingInfo } from "@/types/exam-tracking";
import { UserProfile, ClassInfo } from "@/types/profile";
import SuccessNotification from "@/app/components/SuccessNotification";
import {
  createExamTrackingInfo,
  getStudentExamInfo,
  updateExamTrackingInfo,
} from "@/app/firebase/services/exam-tracking";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { Class } from "@/app/firebase/services/types";

export default function ExamTrackingForm() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [examInfo, setExamInfo] = useState<ExamTrackingInfo | null>(null);
  const [formData, setFormData] = useState<ExamTrackingFormData>({
    examLocation: "",
    examDate: new Date().toISOString().split('T')[0], // Default to today's date in YYYY-MM-DD format
  });
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [classData, setClassData] = useState<ClassInfo | null>(null);

  useEffect(() => {
    const fetchUserAndExamInfo = async () => {
      if (session?.user?.email) {
        try {
          // Fetch user data
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', session.user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data() as UserProfile;
            setUserData(data);

            // If user has a classId, fetch class info
            if (data.classId) {
              try {
                const classRef = doc(db, 'classes', data.classId);
                const classSnapshot = await getDoc(classRef);
                
                if (classSnapshot.exists()) {
                  const classData = classSnapshot.data() as Class;
                  // Get teacher name first
                  const teacherRef = doc(db, 'users', classData.teacherId);
                  const teacherSnapshot = await getDoc(teacherRef);
                  let teacherName = "";
                  
                  if (teacherSnapshot.exists()) {
                    const teacherData = teacherSnapshot.data() as UserProfile;
                    teacherName = teacherData.name;
                  }

                  const classInfo: ClassInfo = {
                    id: classSnapshot.id,
                    name: classData.name,
                    teacherName: teacherName,
                    schedule: classData.schedule,
                    description: classData.description
                  };
                  setClassData(classInfo);
                } else {
                  console.log('No class found for ID:', data.classId);
                }
              } catch (error) {
                console.error('Error fetching class:', error);
              }
            } else {
              console.log('No classId for user:', data);
            }

            // Fetch exam info if available
            try {
              const info = await getStudentExamInfo(session.user.email);
              if (info) {
                setExamInfo(info);
                setFormData({
                  examLocation: info.examLocation,
                  examDate: info.examDate,
                });
              }
            } catch (error) {
              console.error("Error fetching exam info:", error);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    };

    fetchUserAndExamInfo();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      // Check if exam info already exists for this student
      const existingInfo = await getStudentExamInfo(session.user.email);
      
      let newInfo;
      if (existingInfo?.id) {
        // Update existing record
        await updateExamTrackingInfo(existingInfo.id, formData);
        console.log('Updated existing exam tracking info');
      } else {
        // Create new record only if none exists
        const newId = await createExamTrackingInfo(formData, session.user.email);
        console.log('Created new exam tracking info with ID:', newId);
      }

      // Fetch the updated info
      newInfo = await getStudentExamInfo(session.user.email);
      if (newInfo) {
        setExamInfo(newInfo);
        setFormData({
          examLocation: newInfo.examLocation,
          examDate: newInfo.examDate,
        });
        setShowSuccess(true);
        console.log('Successfully saved exam tracking info');
      }
    } catch (error) {
      console.error("Error saving exam info:", error);
      console.error("Error saving exam info:", error);
      const errorMsg = error instanceof Error 
        ? error.message 
        : "Error saving exam information. Please try again later.";
      setErrorMessage(errorMsg);
      // Show error for 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false);
  }, []);

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <>
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[#fc5d01] p-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-4">
              PTE Exam Tracking Information
            </h1>
            <p className="text-white/90 text-sm leading-relaxed">
            Để theo dõi sát sao tiến độ ôn tập và nhận được sự hỗ trợ đặc biệt từ đội ngũ giảng viên dành riêng cho các bạn đã lên kế hoạch thi PTE trong thời gian tới, vui lòng điền đầy đủ thông tin cá nhân vào biểu mẫu dưới đây. Ngoài ra, nếu cần hỗ trợ đăng ký thi, các bạn có thể liên hệ trực tiếp với <b>An Doan</b>.
            </p>
          </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Personal Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[#fc5d01] border-b border-[#fedac2] pb-2">
                Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={userData?.name || ""}
                    readOnly
                    className="w-full p-2 border rounded bg-[#fff8f5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                  <input
                    type="text"
                    value={userData?.email || ""}
                    readOnly
                    className="w-full p-2 border rounded bg-[#fff8f5]"
                  />
                </div>
              </div>
            </div>

            {/* Class Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[#fc5d01] border-b border-[#fedac2] pb-2">
                Class Information
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Target Score</label>
                  <input
                    type="text"
                    value={userData?.target || ""}
                    readOnly
                    className="w-full p-2 border rounded bg-[#fff8f5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Class Name</label>
                  <input
                    type="text"
                    value={classData?.name || ""}
                    readOnly
                    className="w-full p-2 border rounded bg-[#fff8f5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Teacher Name</label>
                  <input
                    type="text"
                    value={classData?.teacherName || ""}
                    readOnly
                    className="w-full p-2 border rounded bg-[#fff8f5]"
                  />
                </div>
              </div>
            </div>

            {/* Exam Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-[#fc5d01] border-b border-[#fedac2] pb-2">
                Exam Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Exam Location
                  </label>
                  <input
                    type="text"
                    value={formData.examLocation}
                    onChange={(e) =>
                      setFormData({ ...formData, examLocation: e.target.value })
                    }
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent hover:border-[#fd7f33] transition-colors"
                    placeholder="Enter exam location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Exam Date</label>
                  <input
                    type="date"
                    value={formData.examDate}
                    min={new Date().toISOString().split('T')[0]} // Can't select past dates
                    onChange={(e) => {
                      const date = e.target.value;
                      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        setFormData({ ...formData, examDate: date });
                      }
                    }}
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent hover:border-[#fd7f33] transition-colors"
                    placeholder="Select exam date"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#fc5d01] hover:bg-[#fd7f33] text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Information
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showSuccess && (
        <SuccessNotification
          message="Exam information saved successfully! A calendar event has been created."
          onClose={handleCloseSuccess}
        />
      )}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{errorMessage}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setErrorMessage(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}
    </>
  );
}
