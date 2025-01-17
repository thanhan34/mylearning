'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HomeworkSubmission } from '../../firebase/services/types';
import ValidationErrorDialog from '../../components/ValidationErrorDialog';
import MaxLinksErrorDialog from '../../components/MaxLinksErrorDialog';
import AssignmentErrorDialog from '../../components/AssignmentErrorDialog';

type HomeworkType = 'Read aloud' | 'Retell lecture' | 'Describe image' | 'Repeat sentence';
import { getHomeworkSubmissions, saveHomeworkSubmission, getUserByEmail } from '../../firebase/services';
import { addNotification } from '../../firebase/services/notification';
import type { User } from '../../firebase/services/user';

// Default homework submissions template
const getDefaultHomeworkSubmissions = (date: string): HomeworkSubmission[] => [
  // Read aloud: 20 questions
  ...Array(20).fill(null).map((_, i) => ({ 
    id: (i + 1).toString(), 
    type: 'Read aloud', 
    questionNumber: i + 1, 
    link: '', 
    date
  })),
  // Repeat sentence: 20 questions
  ...Array(20).fill(null).map((_, i) => ({ 
    id: (i + 21).toString(), 
    type: 'Repeat sentence', 
    questionNumber: i + 1, 
    link: '', 
    date
  })),
  // Describe image: 5 questions
  ...Array(5).fill(null).map((_, i) => ({ 
    id: (i + 41).toString(), 
    type: 'Describe image', 
    questionNumber: i + 1, 
    link: '', 
    date
  })),
  // Retell lecture: 5 questions
  ...Array(5).fill(null).map((_, i) => ({ 
    id: (i + 46).toString(), 
    type: 'Retell lecture', 
    questionNumber: i + 1, 
    link: '', 
    date
  }))
];

export default function SubmitPage() {
  const [selectedHomeworkType, setSelectedHomeworkType] = useState<HomeworkType>('Read aloud');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [existingLinks, setExistingLinks] = useState<string>('');
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [showMaxLinksError, setShowMaxLinksError] = useState(false);
  const [showAssignmentError, setShowAssignmentError] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    invalidLinks: string[];
    expectedFormat: string;
  }>({ invalidLinks: [], expectedFormat: '' });
  const { data: session, status } = useSession();
  const router = useRouter();

  // Check if student is assigned to a teacher
  useEffect(() => {
    const checkAssignment = async () => {
      if (session?.user?.email) {
        const user = await getUserByEmail(session.user.email) as User;
        if (user) {
          setIsAssigned(!!user.teacherId);
        }
      }
    };
    checkAssignment();
  }, [session]);

  // Load existing submissions when type or date changes
  useEffect(() => {
    const loadExisting = async () => {
      if (!session?.user?.email) {
        return;
      }

      try {
        const user = await getUserByEmail(session.user.email) as User;
        if (!user) {
          throw new Error('User not found');
        }
        const submissions = await getHomeworkSubmissions(user.id, selectedDate);
        if (submissions && submissions.length > 0) {
          const links = submissions
            .filter(s => s.type === selectedHomeworkType && s.link)
            .sort((a, b) => a.questionNumber - b.questionNumber)
            .map(s => s.link)
            .join('\n');
          setExistingLinks(links);
        } else {
          setExistingLinks('');
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
        setExistingLinks('');
      }
    };

    loadExisting();
  }, [session?.user?.email, selectedDate, selectedHomeworkType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user?.email || !session?.user?.name) {
      return;
    }

    if (!isAssigned) {
      setShowAssignmentError(true);
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    const validateLink = (link: string) => {
      const patterns: Record<HomeworkType, RegExp> = {
        'Read aloud': /^RA#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
        'Retell lecture': /^RL#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
        'Describe image': /^DI#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
        'Repeat sentence': /^RS#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/
      };
      return patterns[selectedHomeworkType]?.test(link) || false;
    };

    const links = existingLinks.split('\n').filter(link => link.trim());
    
    // Validate link format
    const invalidLinks = links.filter(link => !validateLink(link));
    if (invalidLinks.length > 0) {
      const formatExamples: Record<HomeworkType, string> = {
        'Read aloud': 'RA#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...',
        'Retell lecture': 'RL#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...',
        'Describe image': 'DI#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...',
        'Repeat sentence': 'RS#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...'
      };
      setValidationErrors({
        invalidLinks,
        expectedFormat: formatExamples[selectedHomeworkType]
      });
      setShowValidationError(true);
      setSaveStatus('error');
      return;
    }

    const user = await getUserByEmail(session.user.email) as User;
    if (!user) {
      throw new Error('User not found');
    }

    const maxQuestions = selectedHomeworkType === 'Read aloud' || selectedHomeworkType === 'Repeat sentence' ? 20 : 5;
    if (links.length > maxQuestions) {
      setShowMaxLinksError(true);
      setSaveStatus('error');
      return;
    }

    try {
      // Get existing submissions
      const existingSubmissions = await getHomeworkSubmissions(user.id, selectedDate) || getDefaultHomeworkSubmissions(selectedDate);
      
      // Update only the selected type's submissions
      // Keep existing submissions for other types
      const otherTypeSubmissions = existingSubmissions.filter(s => s.type !== selectedHomeworkType);
      
      // Get template submissions for current type
      const typeTemplate = getDefaultHomeworkSubmissions(selectedDate)
        .filter(s => s.type === selectedHomeworkType);
      
      // Map new links to template
      const typeSubmissions = typeTemplate.map((template, index) => ({
        ...template,
        link: links[index] || ''
      }));

      // Combine both arrays
      const updatedSubmissions = [...otherTypeSubmissions, ...typeSubmissions];
      
      const success = await saveHomeworkSubmission(user.id, updatedSubmissions, session.user.name);
      
      if (!success) {
        throw new Error('Failed to save submissions');
      }

      // Create notification after successful submission
      try {
        // Check if this is a new submission or update
        const isNewSubmission = !existingSubmissions || existingSubmissions.length === 0;
        const message = isNewSubmission
          ? `${session.user.name} has submitted homework for ${selectedDate}`
          : `${session.user.name} has updated their homework for ${selectedDate}`;
        
        console.log('Creating notification:', {
          studentEmail: session.user.email,
          studentName: session.user.name,
          isNewSubmission,
          date: selectedDate
        });
        
        const notificationSuccess = await addNotification(session.user.email, message);
        if (!notificationSuccess) {
          console.error('Failed to create notification for submission:', {
            studentEmail: session.user.email,
            studentName: session.user.name,
            isNewSubmission,
            date: selectedDate
          });
        }
      } catch (notificationError) {
        console.error('Error creating notification:', {
          error: notificationError,
          studentEmail: session.user.email,
          studentName: session.user.name,
          date: selectedDate
        });
      }
      setSaveStatus('saved');
      setTimeout(() => {
        router.refresh(); // Force a refresh of the server components
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error saving submissions:', error);
      setSaveStatus('error');
    }
  };

  if (status === 'unauthenticated') {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#ffffff]">
      <AssignmentErrorDialog
        isOpen={showAssignmentError}
        onClose={() => setShowAssignmentError(false)}
      />
      <MaxLinksErrorDialog
        isOpen={showMaxLinksError}
        onClose={() => setShowMaxLinksError(false)}
        maxQuestions={selectedHomeworkType === 'Read aloud' || selectedHomeworkType === 'Repeat sentence' ? 20 : 5}
        homeworkType={selectedHomeworkType}
      />
      <ValidationErrorDialog
        isOpen={showValidationError}
        onClose={() => setShowValidationError(false)}
        invalidLinks={validationErrors.invalidLinks}
        expectedFormat={validationErrors.expectedFormat}
        homeworkType={selectedHomeworkType}
      />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#fc5d01] text-lg font-medium">Submit Homework</h3>
              <button
                type="button"
                onClick={() => router.back()}
                className="text-[#fc5d01] hover:text-[#fd7f33]"
              >
                Back to Dashboard
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-[#fedac2] rounded px-3 py-2 text-black"
                />
                <select
                  value={selectedHomeworkType}
                  onChange={(e) => setSelectedHomeworkType(e.target.value as HomeworkType)}
                  className="border border-[#fedac2] rounded px-3 py-2 text-black"
                >
                  <option value="Read aloud">Read aloud</option>
                  <option value="Repeat sentence">Repeat sentence</option>
                  <option value="Describe image">Describe image</option>
                  <option value="Retell lecture">Retell lecture</option>
                </select>
              </div>
              <div>
                <label className="block text-black text-sm font-medium mb-2">
                  Paste your {selectedHomeworkType} links (One link per line)
                </label>
                <p className="text-gray-400 text-sm mb-2">
                  Format: {selectedHomeworkType === 'Read aloud' ? 'RA' : selectedHomeworkType === 'Retell lecture' ? 'RL' : selectedHomeworkType === 'Describe image' ? 'DI' : 'RS'}#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...
                </p>
                <textarea
                  name="links"
                  className="w-full h-64 border border-[#fedac2] rounded px-3 py-2 text-black"
                  placeholder={`Example:\n${selectedHomeworkType === 'Read aloud' ? 'RA' : selectedHomeworkType === 'Retell lecture' ? 'RL' : selectedHomeworkType === 'Describe image' ? 'DI' : 'RS'}#1445 APEUni ${selectedHomeworkType === 'Read aloud' ? 'RA' : selectedHomeworkType === 'Retell lecture' ? 'RL' : selectedHomeworkType === 'Describe image' ? 'DI' : 'RS'} EN V2e AI Score 47/90 https://www.apeuni.com/practice/answer_item?model=${selectedHomeworkType === 'Read aloud' ? 'read_alouds' : selectedHomeworkType === 'Retell lecture' ? 'retell_lectures' : selectedHomeworkType === 'Describe image' ? 'describe_images' : 'repeat_sentences'}&answer_id=2937397445\n\nMaximum ${selectedHomeworkType === 'Read aloud' || selectedHomeworkType === 'Repeat sentence' ? 20 : 5} links`}
                  value={existingLinks}
                  onChange={(e) => setExistingLinks(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2 items-center">
                {saveStatus === 'saving' && (
                  <span className="text-[#fd7f33]">Saving...</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-[#fc5d01]">✓ Saved</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-500">Error saving</span>
                )}
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className={`bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33] transition-colors ${
                    saveStatus === 'saving' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
