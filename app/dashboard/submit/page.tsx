'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HomeworkSubmission } from '../../firebase/services/types';
import ValidationErrorDialog from '../../components/ValidationErrorDialog';
import MaxLinksErrorDialog from '../../components/MaxLinksErrorDialog';
import AssignmentErrorDialog from '../../components/AssignmentErrorDialog';

type HomeworkType = 'Read aloud' | 'Retell lecture' | 'Describe image' | 'Repeat sentence' | 'Summarize Written Text' | 'Write Essay' | 'Summarize Spoken Text' | 'Summarize Group Discussion' | 'Respond to a situation';
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
      // Super lenient validation - just check for the prefix and apeuni.com
      
      // Get the prefix based on homework type
      const prefixMap: Record<HomeworkType, string> = {
        'Read aloud': 'RA#',
        'Retell lecture': 'RL#',
        'Describe image': 'DI#',
        'Repeat sentence': 'RS#',
        'Summarize Written Text': 'SWT#',
        'Write Essay': 'WE#',
        'Summarize Spoken Text': 'SST#',
        'Summarize Group Discussion': 'SGD#',
        'Respond to a situation': 'RTS#'
      };
      
      const prefix = prefixMap[selectedHomeworkType];
      
      // Convert to lowercase for case-insensitive matching
      const linkLower = link.toLowerCase();
      
      // Check if the link contains the prefix (case-insensitive)
      const hasPrefix = link.includes(prefix) || linkLower.includes(prefix.toLowerCase());
      
      // Check if the link contains apeuni.com (case-insensitive)
      const hasApeuni = linkLower.includes('apeuni.com') || linkLower.includes('www.apeuni.com');
      
      // Accept any link that contains both the prefix and apeuni.com
      return hasPrefix && hasApeuni;
    };

    // Handle multi-line submissions by joining all lines before validation
    const rawLinks = existingLinks.split('\n').filter(line => line.trim());
    
    // Group lines that belong to the same submission
    const links: string[] = [];
    let currentLink = '';
    
    for (const line of rawLinks) {
      const prefixMap: Record<HomeworkType, string> = {
        'Read aloud': 'RA#',
        'Retell lecture': 'RL#',
        'Describe image': 'DI#',
        'Repeat sentence': 'RS#',
        'Summarize Written Text': 'SWT#',
        'Write Essay': 'WE#',
        'Summarize Spoken Text': 'SST#',
        'Summarize Group Discussion': 'SGD#',
        'Respond to a situation': 'RTS#'
      };
      
      const prefix = prefixMap[selectedHomeworkType];
      
      // If this line starts a new submission, save the previous one and start a new one
      if (line.includes(prefix) || line.toLowerCase().includes(prefix.toLowerCase())) {
        if (currentLink.trim()) {
          links.push(currentLink.trim());
        }
        currentLink = line;
      } else {
        // Otherwise, append to the current submission
        currentLink += ' ' + line;
      }
    }
    
    // Add the last submission if there is one
    if (currentLink.trim()) {
      links.push(currentLink.trim());
    }
    
    // Validate link format
    const invalidLinks = links.filter(link => !validateLink(link));
    if (invalidLinks.length > 0) {
      const formatExamples: Record<HomeworkType, string> = {
        'Read aloud': 'Desktop: RA#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: RA#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Retell lecture': 'Desktop: RL#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: RL#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Describe image': 'Desktop: DI#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: DI#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Repeat sentence': 'Desktop: RS#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: RS#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Written Text': 'Desktop: SWT#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: SWT#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/7 https://www.apeuni.com/en/practice/answer_item?...',
        'Write Essay': 'Desktop: WE#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: WE#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/15 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Spoken Text': 'Desktop: SST#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: SST#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/10 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Group Discussion': 'Desktop: SGD#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?model=summarize_group_discussions&answer_id=...\nMobile với xuống dòng: SGD#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?model=summarize_group_discussions&answer_id=...',
        'Respond to a situation': 'Desktop: RTS#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?model=ptea_respond_situations&answer_id=...\nMobile với xuống dòng: RTS#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?model=ptea_respond_situations&answer_id=...'
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
                  <option value="Summarize Group Discussion">Summarize Group Discussion</option>
                  <option value="Respond to a situation">Respond to a situation</option>
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
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  }#[số] APEUni AI Score https://www.apeuni.com/practice/answer_item?...
                </p>
                <p className="text-gray-400 text-sm mb-2">
                  Format (Mobile với xuống dòng): {
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  }#[số] shared a/an answer from PTE APEUni<br />APEUni AI Score https://www.apeuni.com/en/practice/answer_item?...
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
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  }#${
                    selectedHomeworkType === 'Summarize Group Discussion' ? '54' :
                    selectedHomeworkType === 'Respond to a situation' ? '141' : '1445'
                  } APEUni ${
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD S-ASIA V2.1 ' :
                    selectedHomeworkType === 'Respond to a situation' ? 'RTS S-ASIA V2.1 ' : ''
                  }AI Score ${
                    selectedHomeworkType === 'Summarize Group Discussion' ? '63' :
                    selectedHomeworkType === 'Respond to a situation' ? '48' : '75'
                  }/90 https://www.apeuni.com/practice/answer_item?model=${
                    selectedHomeworkType === 'Read aloud' ? 'read_alouds' : 
                    selectedHomeworkType === 'Retell lecture' ? 'retell_lectures' : 
                    selectedHomeworkType === 'Describe image' ? 'describe_images' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'repeat_sentences' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'summarize_written_texts' :
                    selectedHomeworkType === 'Write Essay' ? 'write_essays' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'summarize_spoken_texts' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'summarize_group_discussions' : 'ptea_respond_situations'
                  }&answer_id=${
                    selectedHomeworkType === 'Summarize Group Discussion' ? '3492481792' :
                    selectedHomeworkType === 'Respond to a situation' ? '3492483247' : '2937397445'
                  }\n\nExample (Mobile với xuống dòng):\n${
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  }#1014 shared an answer from PTE APEUni\nAPEUni AI Score ${
                    selectedHomeworkType === 'Summarize Written Text' ? '6.25/7' :
                    selectedHomeworkType === 'Write Essay' ? '11.8/15' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? '8.5/10' :
                    '59/90'
                  } https://www.apeuni.com/en/practice/answer_item?model=${
                    selectedHomeworkType === 'Read aloud' ? 'read_alouds' : 
                    selectedHomeworkType === 'Retell lecture' ? 'retell_lectures' : 
                    selectedHomeworkType === 'Describe image' ? 'describe_images' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'repeat_sentences' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'swts' :
                    selectedHomeworkType === 'Write Essay' ? 'essays' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'ssts' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'summarize_group_discussions' : 'ptea_respond_situations'
                  }&answer_id=3156378045\n\nNo limit on number of submissions`}
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
