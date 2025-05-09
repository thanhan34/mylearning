import React, { useState, useEffect } from 'react';
import { SupportClass, SupportClassStudent } from '../../../../types/support-speaking';
import { 
  getSupportClassById, 
  addStudentToSupportClass, 
  removeStudentFromSupportClass 
} from '../../../firebase/services/support-speaking';
import { getUserByEmail } from '../../../firebase/services/user';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ClassStudentsList from './ClassStudentsList';
import { User } from '@/types/admin';

interface SupportClassStudentsListProps {
  supportClassId: string;
  onStudentsUpdated: () => void;
  isAdmin?: boolean;
}

const SupportClassStudentsList: React.FC<SupportClassStudentsListProps> = ({ 
  supportClassId, 
  onStudentsUpdated,
  isAdmin = false
}) => {
  const [supportClass, setSupportClass] = useState<SupportClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [showClassStudentsList, setShowClassStudentsList] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Load support class data
  const loadSupportClass = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const classData = await getSupportClassById(supportClassId);
      
      if (classData) {
        setSupportClass(classData);
      } else {
        setError('Support class not found.');
      }
    } catch (err) {
      console.error('Error loading support class:', err);
      setError('Failed to load support class. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadSupportClass();
  }, [supportClassId]);
  
  // Handle add student
  const handleAddStudent = async () => {
    try {
      if (!studentEmail) {
        setError('Please enter a student email.');
        return;
      }
      
      // Get user by email
      const user = await getUserByEmail(studentEmail);
      
      if (!user) {
        setError('Student not found. Please check the email address.');
        return;
      }
      
      if (user.role !== 'student') {
        setError('The provided email does not belong to a student.');
        return;
      }
      
      // Add student to support class
      const student = {
        id: user.id,
        name: user.name || user.email,
        email: user.email
      };
      
      const success = await addStudentToSupportClass(
        supportClassId,
        student,
        supportClass?.teacherId || ''
      );
      
      if (success) {
        // Reload support class
        await loadSupportClass();
        
        // Reset form
        setStudentEmail('');
        
        // Notify parent component
        onStudentsUpdated();
      } else {
        setError('Failed to add student to support class. Please try again.');
      }
    } catch (err) {
      console.error('Error adding student to support class:', err);
      setError('Failed to add student to support class. Please try again.');
    }
  };
  
  // Handle remove student
  const handleRemoveStudent = async () => {
    try {
      if (!selectedStudentId) {
        return;
      }
      
      const success = await removeStudentFromSupportClass(supportClassId, selectedStudentId);
      
      if (success) {
        // Reload support class
        await loadSupportClass();
        
        // Reset selected student
        setSelectedStudentId(null);
        
        // Notify parent component
        onStudentsUpdated();
      } else {
        setError('Failed to remove student from support class. Please try again.');
      }
      
      // Close dialog
      setShowRemoveDialog(false);
    } catch (err) {
      console.error('Error removing student from support class:', err);
      setError('Failed to remove student from support class. Please try again.');
      
      // Close dialog
      setShowRemoveDialog(false);
    }
  };
  
  // Open remove dialog
  const openRemoveDialog = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowRemoveDialog(true);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fc5d01]"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-2">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  
  if (!supportClass) {
    return (
      <div className="p-2">
        <p>Support class not found.</p>
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">
        {supportClass.name} - Students
      </h3>
      
      {isAdmin && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">
            Add Student
          </h4>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
              value={studentEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentEmail(e.target.value)}
              placeholder="Enter student email"
            />
            <button 
              onClick={handleAddStudent}
              className="px-4 py-2 bg-[#fc5d01] text-white rounded-md hover:bg-[#fd7f33] transition-colors"
            >
              Add
            </button>
          </div>
          <button
            onClick={() => setShowClassStudentsList(true)}
            className="w-full py-2 text-[#fc5d01] border border-[#fc5d01] rounded-md hover:bg-[#fedac2] transition-colors"
          >
            Add from Existing Classes
          </button>
        </div>
      )}
      
      <div className="border-t border-gray-200 my-4"></div>
      
      <h4 className="text-sm font-medium mb-2">
        Current Students ({supportClass.students.length})
      </h4>
      
      {supportClass.students.length === 0 ? (
        <div className="p-4 bg-gray-50 text-center rounded-md">
          <p className="text-gray-500 text-sm">
            No students in this support class yet.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {supportClass.students.map((student) => (
            <li key={student.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-gray-500">{student.email}</p>
                <p className="text-xs text-gray-400">
                  Regular Class: {student.regularClassId || 'None'}
                </p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => openRemoveDialog(student.id)}
                  className="p-1 text-gray-500 hover:text-red-500"
                  title="Remove Student"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      
      {/* Remove Confirmation Dialog */}
      {showRemoveDialog && (
        <ConfirmDialog
          title="Remove Student"
          message="Are you sure you want to remove this student from the support class?"
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={handleRemoveStudent}
          onCancel={() => setShowRemoveDialog(false)}
        />
      )}
      
      {/* Class Students List Dialog */}
      {showClassStudentsList && (
        <ClassStudentsList
          onSelect={(student: User) => {
            // Create a SupportClassStudent object from the User
            // Create a SupportClassStudent object from the User
            // Use type assertion to access the classId property we added in ClassStudentsList
            const studentWithClassId = student as User & { classId?: string };
            
            const supportStudent = {
              id: student.id,
              name: student.name,
              email: student.email,
              regularClassId: studentWithClassId.classId || ''
            };
            
            // Add the student to the support class
            addStudentToSupportClass(
              supportClassId,
              supportStudent,
              supportClass?.teacherId || ''
            ).then(success => {
              if (success) {
                loadSupportClass();
                onStudentsUpdated();
              } else {
                setError('Failed to add student to support class. Please try again.');
              }
              setShowClassStudentsList(false);
            });
          }}
          onClose={() => setShowClassStudentsList(false)}
        />
      )}
    </div>
  );
};

export default SupportClassStudentsList;
