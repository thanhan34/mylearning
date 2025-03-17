"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ExamTrackingFormData, ExamTrackingInfo } from "@/types/exam-tracking";
import SuccessNotification from "@/app/components/SuccessNotification";
import {
  createExamTrackingInfo,
  updateExamTrackingInfo,
} from "@/app/firebase/services/exam-tracking";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { UserProfile } from "@/types/profile";
import { Class } from "@/app/firebase/services/types";

interface AdminExamTrackingFormProps {
  onClose: () => void;
  existingExam?: ExamTrackingInfo | null;
}

export default function AdminExamTrackingForm({ onClose, existingExam }: AdminExamTrackingFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string, teacherId: string, teacherName: string}[]>([]);
  
  const [formData, setFormData] = useState<{
    studentId: string;
    classId: string;
    examLocation: string;
    examDate: string;
  }>({
    studentId: existingExam?.email || "",
    classId: "",
    examLocation: existingExam?.examLocation || "",
    examDate: existingExam?.examDate || new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all students
        const studentsRef = collection(db, 'users');
        const studentsQuery = query(studentsRef, where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => {
          const data = doc.data() as UserProfile;
          return {
            ...data,
            id: doc.id
          };
        });
        setStudents(studentsData);
        
        // Fetch all classes with teacher names
        const classesRef = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesRef);
        
        const classesWithTeachers = await Promise.all(
          classesSnapshot.docs.map(async (classDoc) => {
            const classData = classDoc.data() as Class;
            let teacherName = "";
            
            // Get teacher name
            if (classData.teacherId) {
              const teacherDoc = await getDoc(doc(db, 'users', classData.teacherId));
              if (teacherDoc.exists()) {
                const teacherData = teacherDoc.data() as UserProfile;
                teacherName = teacherData.name;
              }
            }
            
            return {
              id: classDoc.id,
              name: classData.name,
              teacherId: classData.teacherId,
              teacherName
            };
          })
        );
        
        setClasses(classesWithTeachers);
        
        // If editing an existing exam, find the class ID
        if (existingExam) {
          const studentClass = classesWithTeachers.find(c => c.name === existingExam.className);
          if (studentClass) {
            setFormData(prev => ({
              ...prev,
              classId: studentClass.id
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [existingExam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setErrorMessage(null);
      
      if (!formData.studentId || !formData.classId) {
        setErrorMessage("Please select both a student and a class");
        return;
      }
      
      // Get student data
      const selectedStudent = students.find(s => s.email === formData.studentId);
      if (!selectedStudent) {
        setErrorMessage("Selected student not found");
        return;
      }
      
      // Get class data
      const selectedClass = classes.find(c => c.id === formData.classId);
      if (!selectedClass) {
        setErrorMessage("Selected class not found");
        return;
      }
      
      const examData: ExamTrackingFormData = {
        examLocation: formData.examLocation,
        examDate: formData.examDate,
      };
      
      if (existingExam?.id) {
        // Update existing record
        await updateExamTrackingInfo(existingExam.id, examData);
      } else {
        // Create new record
        await createExamTrackingInfo(examData, formData.studentId);
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error saving exam info:", error);
      const errorMsg = error instanceof Error 
        ? error.message 
        : "Error saving exam information. Please try again later.";
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !students.length) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[#fc5d01] p-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">
                {existingExam ? "Edit Exam Information" : "Add New Exam Information"}
              </h1>
              <button
                onClick={onClose}
                className="text-white hover:text-[#fedac2] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 text-gray-700">Student</label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                disabled={!!existingExam}
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.email} value={student.email}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 text-gray-700">Class</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                disabled={!!existingExam}
              >
                <option value="">Select a class</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} (Teacher: {classItem.teacherName})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Exam Location
              </label>
              <input
                type="text"
                value={formData.examLocation}
                onChange={(e) => setFormData({ ...formData, examLocation: e.target.value })}
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                placeholder="Enter exam location"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 text-gray-700">Exam Date</label>
              <input
                type="date"
                value={formData.examDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#fc5d01] hover:bg-[#fd7f33] text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
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
                    {existingExam ? "Update" : "Save"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {showSuccess && (
        <SuccessNotification
          message={`Exam information ${existingExam ? 'updated' : 'saved'} successfully!`}
          onClose={() => setShowSuccess(false)}
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
