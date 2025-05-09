import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SupportClass, SupportEvaluation } from '../../../../types/support-speaking';
import { 
  getSupportClassById, 
  evaluateStudentPerformance,
  getStudentEvaluations,
  updateEvaluationNotes
} from '../../../firebase/services/support-speaking';

interface SupportEvaluationManagementProps {
  supportClassId: string;
}

const SupportEvaluationManagement: React.FC<SupportEvaluationManagementProps> = ({ 
  supportClassId 
}) => {
  const { data: session } = useSession();
  const [supportClass, setSupportClass] = useState<SupportClass | null>(null);
  const [evaluations, setEvaluations] = useState<SupportEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  
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
  
  // Load evaluations for a student
  const loadEvaluations = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const studentEvaluations = await getStudentEvaluations(studentId, supportClassId);
      
      setEvaluations(studentEvaluations);
    } catch (err) {
      console.error('Error loading evaluations:', err);
      setError('Failed to load evaluations. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadSupportClass();
  }, [supportClassId]);
  
  useEffect(() => {
    if (selectedStudentId) {
      loadEvaluations(selectedStudentId);
    } else {
      setEvaluations([]);
    }
  }, [selectedStudentId, supportClassId]);
  
  // Handle student selection
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setEditingEvaluationId(null);
    setNotes('');
  };
  
  // Handle evaluation
  const handleEvaluate = async () => {
    try {
      if (!selectedStudentId) {
        setError('Please select a student first.');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const evaluation = await evaluateStudentPerformance(selectedStudentId, supportClassId);
      
      if (evaluation) {
        // Reload evaluations
        await loadEvaluations(selectedStudentId);
      } else {
        setError('Failed to evaluate student. Please try again.');
      }
    } catch (err) {
      console.error('Error evaluating student:', err);
      setError('Failed to evaluate student. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle edit notes
  const handleEditNotes = (evaluationId: string, currentNotes: string = '') => {
    setEditingEvaluationId(evaluationId);
    setNotes(currentNotes);
  };
  
  // Handle save notes
  const handleSaveNotes = async () => {
    try {
      if (!editingEvaluationId) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const success = await updateEvaluationNotes(editingEvaluationId, notes);
      
      if (success) {
        // Reload evaluations
        if (selectedStudentId) {
          await loadEvaluations(selectedStudentId);
        }
        
        // Reset form
        setEditingEvaluationId(null);
        setNotes('');
      } else {
        setError('Failed to update notes. Please try again.');
      }
    } catch (err) {
      console.error('Error updating notes:', err);
      setError('Failed to update notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingEvaluationId(null);
    setNotes('');
  };
  
  if (loading && !supportClass) {
    return (
      <div className="flex justify-center p-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fc5d01]"></div>
      </div>
    );
  }
  
  if (error && !supportClass) {
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
      <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
        Student Evaluation for {supportClass.name}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h4 className="font-medium text-gray-700 mb-3">Students</h4>
            
            {supportClass.students.length === 0 ? (
              <div className="p-4 bg-gray-50 text-center rounded-md">
                <p className="text-gray-500 text-sm">
                  No students in this support class yet.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {supportClass.students.map((student) => (
                  <li 
                    key={student.id}
                    className={`py-2 px-3 cursor-pointer hover:bg-gray-50 rounded-md ${
                      selectedStudentId === student.id ? 'bg-[#fedac2] hover:bg-[#fedac2]' : ''
                    }`}
                    onClick={() => handleStudentSelect(student.id)}
                  >
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="md:col-span-2">
          {selectedStudentId ? (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-700">
                  Evaluation History
                </h4>
                <button
                  onClick={handleEvaluate}
                  className="px-4 py-2 bg-[#fc5d01] text-white rounded-md hover:bg-[#fd7f33] transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Evaluating...' : 'Evaluate Now'}
                </button>
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
              ) : evaluations.length === 0 ? (
                <div className="p-4 bg-gray-50 text-center rounded-md">
                  <p className="text-gray-500">
                    No evaluations found for this student. Click "Evaluate Now" to create one.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => (
                    <div 
                      key={evaluation.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">
                          Evaluation on {new Date(evaluation.date).toLocaleDateString()}
                        </div>
                        <span 
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            evaluation.responsibility === 'teacher'
                              ? 'bg-red-100 text-red-800'
                              : evaluation.responsibility === 'student'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {evaluation.responsibility === 'teacher'
                            ? 'Teacher Responsibility'
                            : evaluation.responsibility === 'student'
                            ? 'Student Responsibility'
                            : 'Inconclusive'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Attendance</div>
                          <div className="font-medium">
                            {Math.round(evaluation.attendanceRate * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Homework</div>
                          <div className="font-medium">
                            {Math.round(evaluation.homeworkCompletionRate * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Progress</div>
                          <div className="font-medium">
                            {evaluation.progressImproved ? 'Improved' : 'Not Improved'}
                          </div>
                        </div>
                      </div>
                      
                      {editingEvaluationId === evaluation.id ? (
                        <div>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes about this evaluation..."
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveNotes}
                              className="px-3 py-1 bg-[#fc5d01] text-white rounded-md hover:bg-[#fd7f33] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Notes:</div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            {evaluation.notes ? (
                              <p className="text-sm">{evaluation.notes}</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">No notes added</p>
                            )}
                          </div>
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => handleEditNotes(evaluation.id, evaluation.notes || '')}
                              className="px-3 py-1 text-sm text-[#fc5d01] hover:text-[#fd7f33] transition-colors"
                            >
                              Edit Notes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-center h-full">
              <p className="text-gray-500">
                Select a student to view and manage evaluations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportEvaluationManagement;
