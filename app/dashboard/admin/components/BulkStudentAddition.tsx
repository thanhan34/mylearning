'use client';

import React, { useState } from 'react';
import { SupportClassStudent } from '../../../../types/support-speaking';
import { getUserByEmail } from '../../../firebase/services/user';
import { addStudentToSupportClass } from '../../../firebase/services/support-speaking';
import SimpleValidationErrorDialog from '../../../components/SimpleValidationErrorDialog';

interface BulkStudentAdditionProps {
  supportClassId: string;
  teacherId: string;
  onStudentsAdded: () => void;
  onClose: () => void;
}

const BulkStudentAddition: React.FC<BulkStudentAdditionProps> = ({
  supportClassId,
  teacherId,
  onStudentsAdded,
  onClose
}) => {
  const [emailsInput, setEmailsInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  }>({ success: 0, failed: 0, errors: [] });
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showValidationError, setShowValidationError] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const handleAddStudents = async () => {
    // Validate input
    if (!emailsInput.trim()) {
      setValidationMessage('Please enter at least one email address.');
      setShowValidationError(true);
      return;
    }

    // Parse emails (split by commas, newlines, or spaces)
    const emails = emailsInput
      .split(/[\s,;]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emails.length === 0) {
      setValidationMessage('Please enter valid email addresses.');
      setShowValidationError(true);
      return;
    }

    setLoading(true);
    const successfulAdds: number = 0;
    const failedAdds: number = 0;
    const errorMessages: string[] = [];

    try {
      // Process each email
      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            // Get user by email
            const user = await getUserByEmail(email);
            
            if (!user) {
              return { success: false, error: `Student not found: ${email}` };
            }
            
            if (user.role !== 'student') {
              return { success: false, error: `${email} is not a student account` };
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
              teacherId
            );
            
            return { success, error: success ? null : `Failed to add ${email}` };
          } catch (error) {
            console.error('Error adding student:', email, error);
            return { success: false, error: `Error adding ${email}: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
        })
      );

      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failedResults = results.filter(r => !r.success);
      const failedCount = failedResults.length;
      const errors = failedResults.map(r => r.error).filter(Boolean) as string[];

      setResults({
        success: successCount,
        failed: failedCount,
        errors
      });
      setShowResults(true);

      // If at least one student was added successfully, notify parent component
      if (successCount > 0) {
        onStudentsAdded();
      }
    } catch (error) {
      console.error('Error in bulk student addition:', error);
      setResults({
        success: successfulAdds,
        failed: failedAdds + emails.length - successfulAdds,
        errors: [...errorMessages, 'An unexpected error occurred during processing']
      });
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">Add Multiple Students</h3>
      
      {!showResults ? (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Enter student email addresses separated by commas, spaces, or new lines.
          </p>
          
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent mb-4"
            rows={6}
            value={emailsInput}
            onChange={(e) => setEmailsInput(e.target.value)}
            placeholder="student1@example.com, student2@example.com, student3@example.com"
            disabled={loading}
          />
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddStudents}
              className="px-4 py-2 bg-[#fc5d01] text-white hover:bg-[#fd7f33] rounded-lg transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Add Students'
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg p-4">
          <div className="mb-4">
            <h4 className="font-medium text-lg mb-2">Results</h4>
            <div className="flex space-x-4">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md">
                <span className="font-bold">{results.success}</span> students added successfully
              </div>
              {results.failed > 0 && (
                <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md">
                  <span className="font-bold">{results.failed}</span> failed
                </div>
              )}
            </div>
          </div>
          
          {results.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Errors</h4>
              <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                <ul className="list-disc pl-5 space-y-1">
                  {results.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowResults(false);
                setEmailsInput('');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              Add More Students
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#fc5d01] text-white hover:bg-[#fd7f33] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showValidationError && (
        <SimpleValidationErrorDialog
          message={validationMessage}
          onClose={() => setShowValidationError(false)}
        />
      )}
    </div>
  );
};

export default BulkStudentAddition;
