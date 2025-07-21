"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ExamTrackingWithStudentInfo,
  AdminExamTrackingFormData,
  ClassOption,
  StudentOption,
} from "@/types/exam-tracking";
import SuccessNotification from "@/app/components/SuccessNotification";
import {
  getAllClasses,
  getStudentsByClassId,
  createExamTrackingByAdmin,
  updateExamTrackingByAdmin,
  getAllExamInfoWithClassId,
  deleteExamTrackingInfo,
} from "@/app/firebase/services/exam-tracking";

export default function ExamTrackingManagement() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Data states
  const [examRecords, setExamRecords] = useState<ExamTrackingWithStudentInfo[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  // Form states
  const [formData, setFormData] = useState<AdminExamTrackingFormData>({
    classId: "",
    studentId: "",
    name: "",
    email: "",
    target: "",
    examLocation: "",
    examDate: new Date().toISOString().split('T')[0],
  });

  // Filter states
  const [filterClass, setFilterClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examData, classData] = await Promise.all([
        getAllExamInfoWithClassId(),
        getAllClasses(),
      ]);
      setExamRecords(examData);
      setClasses(classData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage("Error loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClassChange = async (classId: string) => {
    setFormData(prev => ({ ...prev, classId, studentId: "", name: "", email: "", target: "" }));
    
    if (classId) {
      try {
        const studentsData = await getStudentsByClassId(classId);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
      }
    } else {
      setStudents([]);
    }
  };

  const handleStudentChange = (studentId: string) => {
    const selectedStudent = students.find(s => s.id === studentId);
    if (selectedStudent) {
      setFormData(prev => ({
        ...prev,
        studentId,
        name: selectedStudent.name,
        email: selectedStudent.email,
        target: selectedStudent.target || "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      if (editingId) {
        await updateExamTrackingByAdmin(editingId, formData, session.user.email);
        setSuccessMessage("Exam information updated successfully!");
      } else {
        await createExamTrackingByAdmin(formData, session.user.email);
        setSuccessMessage("Exam information created successfully!");
      }

      setShowSuccess(true);
      setShowForm(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Error saving exam info:", error);
      const errorMsg = error instanceof Error 
        ? error.message 
        : "Error saving exam information. Please try again.";
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (record: ExamTrackingWithStudentInfo) => {
    setEditingId(record.id || null);
    
    // Load students for the class
    if (record.classId) {
      try {
        const studentsData = await getStudentsByClassId(record.classId);
        // For edit mode, include the current student even if they have exam tracking
        const currentStudent = {
          id: record.studentId,
          name: record.name,
          email: record.email,
          target: record.target,
        };
        const allStudents = studentsData.some(s => s.id === currentStudent.id) 
          ? studentsData 
          : [...studentsData, currentStudent];
        setStudents(allStudents);
      } catch (error) {
        console.error("Error fetching students for edit:", error);
        setStudents([]);
      }
    }

    setFormData({
      classId: record.classId || "",
      studentId: record.studentId,
      name: record.name,
      email: record.email,
      target: record.target || "",
      examLocation: record.examLocation,
      examDate: record.examDate,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this exam tracking record?")) {
      return;
    }

    try {
      await deleteExamTrackingInfo(id);
      setSuccessMessage("Exam tracking record deleted successfully!");
      setShowSuccess(true);
      await fetchData();
    } catch (error) {
      console.error("Error deleting exam info:", error);
      setErrorMessage("Error deleting exam information. Please try again.");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      classId: "",
      studentId: "",
      name: "",
      email: "",
      target: "",
      examLocation: "",
      examDate: new Date().toISOString().split('T')[0],
    });
    setStudents([]);
    setEditingId(null);
  };

  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // Filter exam records
  const filteredRecords = examRecords.filter(record => {
    const matchesClass = !filterClass || record.classId === filterClass;
    const matchesSearch = !searchTerm || 
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.examLocation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  if (loading && examRecords.length === 0) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[#fc5d01] p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Exam Tracking Management
                </h1>
                <p className="text-white/90 text-sm">
                  Manage student exam information and track exam schedules
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="bg-white text-[#fc5d01] font-bold py-2 px-6 rounded-lg hover:bg-[#fff8f5] transition-colors"
              >
                Add New Exam
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-[#fedac2]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Filter by Class
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.teacherName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or location..."
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Exam Records Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-black">
              <thead className="bg-[#fedac2]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Student</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Class</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Target</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Exam Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#fff8f5]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{record.name}</div>
                        <div className="text-sm text-gray-500">{record.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{record.className}</div>
                        <div className="text-sm text-gray-500">{record.teacherName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{record.target || "N/A"}</td>
                    <td className="px-6 py-4">
                      {new Date(record.examDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{record.examLocation}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-[#fc5d01] hover:text-[#fd7f33] font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(record.id!)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No exam records found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
              {editingId ? "Edit Exam Information" : "Add New Exam Information"}
            </h3>
            <form onSubmit={handleSubmit} className="text-black">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.teacherName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Student</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    required
                    disabled={!formData.classId}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Student Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Target Score</label>
                <input
                  type="text"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                  placeholder="e.g., 65, 79"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Exam Location</label>
                  <input
                    type="text"
                    value={formData.examLocation}
                    onChange={(e) => setFormData({ ...formData, examLocation: e.target.value })}
                    required
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                    placeholder="Enter exam location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={formData.examDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    required
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fd7f33] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#fc5d01] hover:bg-[#fd7f33] text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                      {editingId ? "Update" : "Save"} Information
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <SuccessNotification
          message={successMessage}
          onClose={handleCloseSuccess}
        />
      )}

      {/* Error Message */}
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
