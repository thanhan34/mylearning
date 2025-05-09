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
import MultiSelectStudentsList from './MultiSelectStudentsList';
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
  const [showMultiSelect, setShowMultiSelect] = useState(false);
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
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex gap-2">
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
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setShowMultiSelect(true)}
                className="py-2 text-[#fc5d01] border border-[#fc5d01] rounded-md hover:bg-[#fedac2] transition-colors"
              >
                Add Multiple Students
              </button>
            </div>
          </div>
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
      
      {/* Multi-Select Students Dialog */}
      {showMultiSelect && supportClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#fc5d01]">Add Multiple Students</h3>
              <button
                onClick={() => setShowMultiSelect(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <MultiSelectStudentsList
              supportClassId={supportClassId}
              teacherId={supportClass.teacherId}
              existingStudentIds={supportClass.students.map(student => student.id)}
              onStudentsAdded={() => {
                loadSupportClass();
                onStudentsUpdated();
              }}
              onClose={() => setShowMultiSelect(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportClassStudentsList;
