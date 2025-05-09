'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { User } from '@/types/admin';
import { getClassById } from '@/app/firebase/services/class';
import { SupportClassStudent } from '@/types/support-speaking';
import { addStudentToSupportClass } from '@/app/firebase/services/support-speaking';

interface Props {
  supportClassId: string;
  teacherId: string;
  existingStudentIds: string[];
  onStudentsAdded: () => void;
  onClose: () => void;
}

export default function MultiSelectStudentsList({ 
  supportClassId, 
  teacherId, 
  existingStudentIds, 
  onStudentsAdded, 
  onClose 
}: Props) {
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);
  const [addingStudents, setAddingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load all classes
  useEffect(() => {
    const classesRef = collection(db, 'classes');
    
    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(classesRef);
        const classesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        
        setClasses(classesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Load students when a class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setFilteredStudents([]);
      return;
    }

    setClassLoading(true);
    
    const fetchStudents = async () => {
      try {
        const classData = await getClassById(selectedClassId);
        
        if (classData && classData.students) {
          // Convert class students to User objects
          const studentUsers = classData.students.map(student => ({
            id: student.id,
            email: student.email,
            name: student.name,
            role: 'student' as const,
            classId: selectedClassId,
            createdAt: new Date().toISOString() // Add createdAt field required by User type
          }));
          
          setStudents(studentUsers);
          
          // Filter out students who are already in the support class
          const filtered = studentUsers.filter(
            student => !existingStudentIds.includes(student.id)
          );
          setFilteredStudents(filtered);
        } else {
          setStudents([]);
          setFilteredStudents([]);
        }
      } catch (error) {
        console.error('Error fetching class students:', error);
      } finally {
        setClassLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClassId, existingStudentIds]);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(
        students.filter(student => !existingStudentIds.includes(student.id))
      );
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = students.filter(
      student => 
        (student.name?.toLowerCase().includes(lowerSearchTerm) || 
         student.email.toLowerCase().includes(lowerSearchTerm)) &&
        !existingStudentIds.includes(student.id)
    );
    
    setFilteredStudents(filtered);
  }, [searchTerm, students, existingStudentIds]);

  // Handle checkbox change
  const handleCheckboxChange = (studentId: string) => {
    setSelectedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Handle select all
  const handleSelectAll = () => {
    const allSelected = filteredStudents.every(student => selectedStudents[student.id]);
    
    if (allSelected) {
      // Deselect all
      const newSelected = { ...selectedStudents };
      filteredStudents.forEach(student => {
        newSelected[student.id] = false;
      });
      setSelectedStudents(newSelected);
    } else {
      // Select all
      const newSelected = { ...selectedStudents };
      filteredStudents.forEach(student => {
        newSelected[student.id] = true;
      });
      setSelectedStudents(newSelected);
    }
  };

  // Add selected students to support class
  const handleAddStudents = async () => {
    const selectedStudentIds = Object.entries(selectedStudents)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (selectedStudentIds.length === 0) {
      return;
    }
    
    setAddingStudents(true);
    
    try {
      // Add each selected student to the support class
      for (const studentId of selectedStudentIds) {
        const student = students.find(s => s.id === studentId);
        
        if (student) {
          const supportStudent: Omit<SupportClassStudent, 'regularClassId'> = {
            id: student.id,
            name: student.name || student.email,
            email: student.email
          };
          
          await addStudentToSupportClass(
            supportClassId,
            supportStudent,
            teacherId
          );
        }
      }
      
      // Notify parent component
      onStudentsAdded();
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error('Error adding students to support class:', error);
    } finally {
      setAddingStudents(false);
    }
  };

  // Count selected students
  const selectedCount = Object.values(selectedStudents).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">Add Multiple Students</h3>
      
      {/* Class selector */}
      <div className="mb-4">
        <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Class
        </label>
        <select
          id="class-select"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
          value={selectedClassId || ''}
          onChange={(e) => setSelectedClassId(e.target.value || null)}
        >
          <option value="">-- Select a class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Search input */}
      {selectedClassId && (
        <div className="mb-4">
          <label htmlFor="search-students" className="block text-sm font-medium text-gray-700 mb-1">
            Search Students
          </label>
          <input
            id="search-students"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}
      
      {/* Students list */}
      {classLoading ? (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
        </div>
      ) : selectedClassId ? (
        filteredStudents.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded-md">
            <p className="text-gray-500">
              {students.length === 0 
                ? "No students found in this class" 
                : "All students from this class are already in the support class"}
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="select-all"
                  className="h-4 w-4 text-[#fc5d01] focus:ring-[#fc5d01] border-gray-300 rounded"
                  checked={filteredStudents.length > 0 && filteredStudents.every(student => selectedStudents[student.id])}
                  onChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-700">
                  Select All ({filteredStudents.length})
                </label>
              </div>
              <span className="text-sm text-gray-500">
                {selectedCount} selected
              </span>
            </div>
            
            <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`student-${student.id}`}
                    className="h-4 w-4 text-[#fc5d01] focus:ring-[#fc5d01] border-gray-300 rounded"
                    checked={!!selectedStudents[student.id]}
                    onChange={() => handleCheckboxChange(student.id)}
                  />
                  <label htmlFor={`student-${student.id}`} className="ml-3 flex-1 cursor-pointer">
                    <div className="font-medium text-black">{student.name}</div>
                    <div className="text-sm text-gray-600">{student.email}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-4 bg-gray-50 rounded-md">
          <p className="text-gray-500">Please select a class to view students</p>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-end space-x-3 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          disabled={addingStudents}
        >
          Cancel
        </button>
        <button
          onClick={handleAddStudents}
          className="px-4 py-2 bg-[#fc5d01] text-white hover:bg-[#fd7f33] rounded-lg transition-colors flex items-center"
          disabled={selectedCount === 0 || addingStudents}
        >
          {addingStudents ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Adding...
            </>
          ) : (
            `Add ${selectedCount} Student${selectedCount !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
}
