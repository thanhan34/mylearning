'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HomeworkSubmission } from '../../firebase/services/types';
import ValidationErrorDialog from '../../components/ValidationErrorDialog';
import MaxLinksErrorDialog from '../../components/MaxLinksErrorDialog';
import AssignmentErrorDialog from '../../components/AssignmentErrorDialog';

type HomeworkType = 'Read aloud' | 'Retell lecture' | 'Describe image' | 'Repeat sentence' | 'Summarize Written Text' | 'Write Essay' | 'Summarize Spoken Text';
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
  })),
  // Summarize Written Text: 3 questions
  ...Array(3).fill(null).map((_, i) => ({
    id: (i + 51).toString(),
    type: 'Summarize Written Text',
    questionNumber: i + 1,
    link: '',
    date
  })),
  // Write Essay: 2 questions
  ...Array(2).fill(null).map((_, i) => ({
    id: (i + 54).toString(),
    type: 'Write Essay',
    questionNumber: i + 1,
    link: '',
    date
  })),
  // Summarize Spoken Text: 2 questions
  ...Array(2).fill(null).map((_, i) => ({
    id: (i + 56).toString(),
    type: 'Summarize Spoken Text',
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
      // Normalize the link by removing line breaks and extra spaces
      const normalizedLink = link.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      const patterns: Record<HomeworkType, RegExp[]> = {
        'Read aloud': [
          // Desktop format
          /^RA#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^RA#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format
          /^RA#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+\/90 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^RA#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ],
        'Retell lecture': [
          // Desktop format
          /^RL#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^RL#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format
          /^RL#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+\/90 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^RL#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ],
        'Describe image': [
          // Desktop format
          /^DI#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^DI#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format
          /^DI#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+\/90 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^DI#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ],
        'Repeat sentence': [
          // Desktop format
          /^RS#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^RS#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format
          /^RS#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+\/90 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^RS#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ],
        'Summarize Written Text': [
          // Desktop format
          /^SWT#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^SWT#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format - note that SWT uses different score format (out of 7)
          /^SWT#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+(\.\d+)?\/7 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^SWT#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ],
        'Write Essay': [
          // Desktop format
          /^WE#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^WE#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format - note that WE uses different score format (out of 15)
          /^WE#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+(\.\d+)?\/15 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^WE#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ],
        'Summarize Spoken Text': [
          // Desktop format
          /^SST#\d+ APEUni.*AI Score \d+\/90 https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          /^SST#\d+ APEUni.*AI Score.*https:\/\/www\.apeuni\.com\/practice\/answer_item\?.*$/,
          // Mobile format - note that SST uses different score format (out of 10)
          /^SST#\d+ shared a answer from PTE APEUni.*APEUni AI Score \d+(\.\d+)?\/10 https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/,
          /^SST#\d+ shared a answer from PTE APEUni.*APEUni AI Score.*https:\/\/www\.apeuni\.com\/en\/practice\/answer_item\?.*$/
        ]
      };
      return patterns[selectedHomeworkType]?.some(pattern => pattern.test(link)) || false;
    };

    const links = existingLinks.split('\n').filter(link => link.trim());
    
    // Validate link format
    const invalidLinks = links.filter(link => !validateLink(link));
    if (invalidLinks.length > 0) {
      const formatExamples: Record<HomeworkType, string> = {
        'Read aloud': 'Desktop: RA#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: RA#[số] shared a answer from PTE APEUni APEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Retell lecture': 'Desktop: RL#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: RL#[số] shared a answer from PTE APEUni APEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Describe image': 'Desktop: DI#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: DI#[số] shared a answer from PTE APEUni APEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Repeat sentence': 'Desktop: RS#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: RS#[số] shared a answer from PTE APEUni APEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Written Text': 'Desktop: SWT#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: SWT#[số] shared a answer from PTE APEUni APEUni AI Score [số]/7 https://www.apeuni.com/en/practice/answer_item?...',
        'Write Essay': 'Desktop: WE#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: WE#[số] shared a answer from PTE APEUni APEUni AI Score [số]/15 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Spoken Text': 'Desktop: SST#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile: SST#[số] shared a answer from PTE APEUni APEUni AI Score [số]/10 https://www.apeuni.com/en/practice/answer_item?...'
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

    // Removed submission limit check to allow unlimited submissions for all homework types

    try {
      // Get existing submissions
      const existingSubmissions = await getHomeworkSubmissions(user.id, selectedDate) || getDefaultHomeworkSubmissions(selectedDate);
      
      // Update only the selected type's submissions
      // Keep existing submissions for other types
      const otherTypeSubmissions = existingSubmissions.filter(s => s.type !== selectedHomeworkType);
      
      // Create new submissions for each link
      const typeSubmissions = links.map((link, index) => ({
        id: `${selectedHomeworkType}_${index + 1}`,
        type: selectedHomeworkType,
        questionNumber: index + 1,
        link: link,
        date: selectedDate
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
        
        const notificationSuccess = await addNotification(session.user.email, message, 'teacher');
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
        maxQuestions={
          selectedHomeworkType === 'Read aloud' || selectedHomeworkType === 'Repeat sentence' ? 20 : 
          selectedHomeworkType === 'Describe image' || selectedHomeworkType === 'Retell lecture' ? 5 :
          selectedHomeworkType === 'Summarize Written Text' ? 3 : 2
        }
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
                  <option value="Summarize Written Text">Summarize Written Text</option>
                  <option value="Write Essay">Write Essay</option>
                  <option value="Summarize Spoken Text">Summarize Spoken Text</option>
                </select>
              </div>
              <div>
                <label className="block text-black text-sm font-medium mb-2">
                  Paste your {selectedHomeworkType} links (One link per line)
                </label>
                <p className="text-gray-400 text-sm mb-2">
                  Format (Desktop): {
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' : 'SST'
                  }#[số] APEUni AI Score https://www.apeuni.com/practice/answer_item?...
                </p>
                <p className="text-gray-400 text-sm mb-2">
                  Format (Mobile): {
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' : 'SST'
                  }#[số] shared a answer from PTE APEUni APEUni AI Score https://www.apeuni.com/en/practice/answer_item?...
                </p>
                <textarea
                  name="links"
                  className="w-full h-64 border border-[#fedac2] rounded px-3 py-2 text-black"
                  placeholder={`Example (Desktop):\n${
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' : 'SST'
                  }#1445 APEUni AI Score https://www.apeuni.com/practice/answer_item?model=${
                    selectedHomeworkType === 'Read aloud' ? 'read_alouds' : 
                    selectedHomeworkType === 'Retell lecture' ? 'retell_lectures' : 
                    selectedHomeworkType === 'Describe image' ? 'describe_images' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'repeat_sentences' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'summarize_written_texts' :
                    selectedHomeworkType === 'Write Essay' ? 'write_essays' : 'summarize_spoken_texts'
                  }&answer_id=2937397445\n\nExample (Mobile):\n${
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' : 'SST'
                  }#338 shared a answer from PTE APEUni\nAPEUni AI Score ${
                    selectedHomeworkType === 'Summarize Written Text' ? '6.25/7' :
                    selectedHomeworkType === 'Write Essay' ? '11.8/15' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? '8.5/10' :
                    '67/90'
                  } https://www.apeuni.com/en/practice/answer_item?model=${
                    selectedHomeworkType === 'Read aloud' ? 'read_alouds' : 
                    selectedHomeworkType === 'Retell lecture' ? 'retell_lectures' : 
                    selectedHomeworkType === 'Describe image' ? 'describe_images' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'repeat_sentences' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'swts' :
                    selectedHomeworkType === 'Write Essay' ? 'essays' : 'ssts'
                  }&answer_id=3139921963\n\nNo limit on number of submissions`}
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
