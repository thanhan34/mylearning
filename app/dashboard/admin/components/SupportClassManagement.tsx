import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SupportClass } from '../../../../types/support-speaking';
import { createSupportClass, getSupportClassById, getTeacherSupportClasses, getAllSupportClasses, deleteSupportClass } from '../../../firebase/services/support-speaking';
import { getUserByEmail } from '../../../firebase/services/user';
import ConfirmDialog from '../../../components/ConfirmDialog';
import SupportClassStudentsList from './SupportClassStudentsList';
import SupportAttendanceManagement from './SupportAttendanceManagement';
import SupportEvaluationManagement from './SupportEvaluationManagement';

interface SupportClassManagementProps {
  teacherEmail?: string;
  isAdmin?: boolean;
}

const SupportClassManagement: React.FC<SupportClassManagementProps> = ({ 
  teacherEmail,
  isAdmin = false
}) => {
  const { data: session } = useSession();
  const [supportClasses, setSupportClasses] = useState<SupportClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStudentsDialog, setShowStudentsDialog] = useState(false);
  
  // Form states
  const [className, setClassName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'classes' | 'attendance' | 'evaluation'>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // Load support classes
  const loadSupportClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let fetchedClasses: SupportClass[] = [];
      
      if (teacherEmail && !isAdmin) {
        // Load classes for a specific teacher (non-admin)
        fetchedClasses = await getTeacherSupportClasses(teacherEmail);
      } else if (isAdmin) {
        // For admin, load all classes
        if (teacherEmail) {
          // If admin is viewing a specific teacher's classes
          fetchedClasses = await getTeacherSupportClasses(teacherEmail);
        } else {
          // Admin viewing all classes
          fetchedClasses = await getAllSupportClasses();
        }
      }
      
      setSupportClasses(fetchedClasses);
    } catch (err) {
      console.error('Error loading support classes:', err);
      setError('Failed to load support classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (session) {
      loadSupportClasses();
    }
  }, [session]);
  
  // Handle create class
  const handleCreateClass = async () => {
    try {
      if (!className || !teacherId || !description || !schedule) {
        setError('Please fill in all required fields.');
        return;
      }
      
      const newClassData = {
        name: className,
        teacherId,
        description,
        schedule,
        students: [],
        createdAt: new Date().toISOString(),
        studentCount: 0
      };
      
      const classId = await createSupportClass(newClassData);
      
      if (classId) {
        // Reload classes
        await loadSupportClasses();
        
        // Reset form
        setClassName('');
        setTeacherId('');
        setDescription('');
        setSchedule('');
        
        // Close dialog
        setCreateDialogOpen(false);
      } else {
        setError('Failed to create support class. Please try again.');
      }
    } catch (err) {
      console.error('Error creating support class:', err);
      setError('Failed to create support class. Please try again.');
    }
  };
  
  // Handle edit class
  const handleEditClass = async () => {
    try {
      if (!selectedClassId || !className || !description || !schedule) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // In a real implementation, you would update the class
      // For now, we'll just reload the classes
      await loadSupportClasses();
      
      // Reset form
      setClassName('');
      setTeacherId('');
      setDescription('');
      setSchedule('');
      setSelectedClassId(null);
      
      // Close dialog
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error editing support class:', err);
      setError('Failed to edit support class. Please try again.');
    }
  };
  
  // Handle delete class
  const handleDeleteClass = async () => {
    try {
      if (!selectedClassId) {
        return;
      }
      
      // Delete the class
      const success = await deleteSupportClass(selectedClassId);
      
      if (success) {
        // Reload classes
        await loadSupportClasses();
        
        // Reset selected class
        setSelectedClassId(null);
        
        // Close dialog
        setShowDeleteDialog(false);
      } else {
        setError('Failed to delete support class. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting support class:', err);
      setError('Failed to delete support class. Please try again.');
    }
  };
  
  // Handle class selection
  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
  };
  
  // Open edit dialog
  const openEditDialog = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering class selection
    const selectedClass = supportClasses.find(c => c.id === classId);
    
    if (selectedClass) {
      setSelectedClassId(classId);
      setClassName(selectedClass.name);
      setTeacherId(selectedClass.teacherId);
      setDescription(selectedClass.description);
      setSchedule(selectedClass.schedule);
      
      setEditDialogOpen(true);
    }
  };
  
  // Open delete dialog
  const openDeleteDialog = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering class selection
    setSelectedClassId(classId);
    setShowDeleteDialog(true);
  };
  
  // Open students dialog
  const openStudentsDialog = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering class selection
    setSelectedClassId(classId);
    setShowStudentsDialog(true);
  };
  
  // Render tab content
  const renderTabContent = () => {
    if (activeTab === 'classes') {
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#fc5d01]">
              Support Speaking Classes
            </h2>
            {isAdmin && (
              <button 
                className="flex items-center px-4 py-2 bg-[#fc5d01] text-white rounded-md hover:bg-[#fd7f33] transition-colors"
                onClick={() => setCreateDialogOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Class
              </button>
            )}
          </div>
          
          {error && (
            <div className="mb-4">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center p-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fc5d01]"></div>
            </div>
          ) : supportClasses.length === 0 ? (
            <div className="p-6 bg-gray-50 text-center rounded-md">
              <p className="text-gray-700">No support speaking classes found.</p>
              <p className="text-gray-500 text-sm mt-1">
                Create a new class to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supportClasses.map((supportClass) => (
                <div 
                  key={supportClass.id} 
                  className={`bg-white rounded-lg shadow-md border-l-4 border-[#fc5d01] overflow-hidden cursor-pointer transition-all ${
                    selectedClassId === supportClass.id ? 'ring-2 ring-[#fc5d01]' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handleClassSelect(supportClass.id)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold mb-1">{supportClass.name}</h3>
                      <div className="flex space-x-1">
                        <button 
                          onClick={(e) => openStudentsDialog(supportClass.id, e)}
                          className="p-1 text-gray-500 hover:text-[#fc5d01]"
                          title="Manage Students"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => openEditDialog(supportClass.id, e)}
                              className="p-1 text-gray-500 hover:text-[#fc5d01]"
                              title="Edit Class"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => openDeleteDialog(supportClass.id, e)}
                              className="p-1 text-gray-500 hover:text-red-500"
                              title="Delete Class"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-2">
                      Schedule: {supportClass.schedule}
                    </p>
                    
                    <p className="text-sm mb-4">
                      {supportClass.description}
                    </p>
                    
                    <div className="flex justify-between mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fedac2] text-[#fc5d01]">
                        {supportClass.students.length} Students
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    } else if (activeTab === 'attendance') {
      return selectedClassId ? (
        <SupportAttendanceManagement supportClassId={selectedClassId} isAdmin={isAdmin} />
      ) : (
        <div className="p-6 bg-gray-50 text-center rounded-md">
          <p className="text-gray-700">Please select a class to manage attendance.</p>
        </div>
      );
    } else if (activeTab === 'evaluation') {
      return selectedClassId ? (
        <SupportEvaluationManagement supportClassId={selectedClassId} />
      ) : (
        <div className="p-6 bg-gray-50 text-center rounded-md">
          <p className="text-gray-700">Please select a class to view evaluations.</p>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="mt-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'classes'
                ? 'border-[#fc5d01] text-[#fc5d01]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Classes
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'attendance'
                ? 'border-[#fc5d01] text-[#fc5d01]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'evaluation'
                ? 'border-[#fc5d01] text-[#fc5d01]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Evaluation
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      {renderTabContent()}
      
      {/* Create Class Dialog */}
      {createDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold text-[#fc5d01] mb-4">Create Support Speaking Class</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  id="className"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={className}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher Email
                </label>
                <input
                  id="teacherId"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={teacherId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherId(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Enter the teacher's email address</p>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule
                </label>
                <input
                  id="schedule"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={schedule}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule(e.target.value)}
                  placeholder="e.g., Monday and Wednesday, 3:00 PM - 4:00 PM"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                className="px-4 py-2 bg-[#fc5d01] text-white hover:bg-[#fd7f33] rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Class Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold text-[#fc5d01] mb-4">Edit Support Speaking Class</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="editClassName" className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  id="editClassName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={className}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="editDescription"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="editSchedule" className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule
                </label>
                <input
                  id="editSchedule"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                  value={schedule}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule(e.target.value)}
                  placeholder="e.g., Monday and Wednesday, 3:00 PM - 4:00 PM"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditDialogOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditClass}
                className="px-4 py-2 bg-[#fc5d01] text-white hover:bg-[#fd7f33] rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Support Speaking Class"
          message="Are you sure you want to delete this support speaking class? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteClass}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
      
      {/* Students Management Dialog */}
      {showStudentsDialog && selectedClassId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#fc5d01]">Manage Students</h3>
              <button
                onClick={() => setShowStudentsDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <SupportClassStudentsList 
              supportClassId={selectedClassId} 
              onStudentsUpdated={loadSupportClasses}
              isAdmin={isAdmin}
            />
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowStudentsDialog(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportClassManagement;
