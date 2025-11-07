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
      const prefixMap: Record<HomeworkType, string[]> = {
        'Read aloud': ['RA#', 'RA (C)#', 'RA(C)#'],
        'Retell lecture': ['RL#', 'RL (C)#', 'RL(C)#'],
        'Describe image': ['DI#', 'DI (C)#', 'DI(C)#'],
        'Repeat sentence': ['RS#', 'RS (C)#', 'RS(C)#'],
        'Summarize Written Text': ['SWT#', 'SWT (C)#', 'SWT(C)#'],
        'Write Essay': ['WE#', 'WE (C)#', 'WE(C)#'],
        'Summarize Spoken Text': ['SST#', 'SST (C)#', 'SST(C)#'],
        'Summarize Group Discussion': ['SGD#', 'SGD (C)#', 'SGD(C)#'],
        'Respond to a situation': ['RTS#', 'RTS (C)#', 'RTS(C)#']
      };
      
      const prefixes = prefixMap[selectedHomeworkType];
      
      // Convert to lowercase for case-insensitive matching
      const linkLower = link.toLowerCase();
      
      // Check if the link contains any of the accepted prefixes (case-insensitive)
      const hasPrefix = prefixes.some(prefix => 
        link.includes(prefix) || linkLower.includes(prefix.toLowerCase())
      );
      
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
      const prefixMap: Record<HomeworkType, string[]> = {
        'Read aloud': ['RA#', 'RA (C)#', 'RA(C)#'],
        'Retell lecture': ['RL#', 'RL (C)#', 'RL(C)#'],
        'Describe image': ['DI#', 'DI (C)#', 'DI(C)#'],
        'Repeat sentence': ['RS#', 'RS (C)#', 'RS(C)#'],
        'Summarize Written Text': ['SWT#', 'SWT (C)#', 'SWT(C)#'],
        'Write Essay': ['WE#', 'WE (C)#', 'WE(C)#'],
        'Summarize Spoken Text': ['SST#', 'SST (C)#', 'SST(C)#'],
        'Summarize Group Discussion': ['SGD#', 'SGD (C)#', 'SGD(C)#'],
        'Respond to a situation': ['RTS#', 'RTS (C)#', 'RTS(C)#']
      };
      
      const prefixes = prefixMap[selectedHomeworkType];
      
      // If this line starts a new submission, save the previous one and start a new one
      const lineStartsWithPrefix = prefixes.some(prefix => 
        line.includes(prefix) || line.toLowerCase().includes(prefix.toLowerCase())
      );
      
      if (lineStartsWithPrefix) {
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
        'Read aloud': 'Desktop: RA#[số] hoặc RA (C)#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: RA#[số] hoặc RA (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Retell lecture': 'Desktop: RL#[số] hoặc RL (C)#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: RL#[số] hoặc RL (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Describe image': 'Desktop: DI#[số] hoặc DI (C)#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: DI#[số] hoặc DI (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Repeat sentence': 'Desktop: RS#[số] hoặc RS (C)#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: RS#[số] hoặc RS (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Written Text': 'Desktop: SWT#[số] hoặc SWT (C)#[số] APEUni AI Score [số]/8 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: SWT#[số] hoặc SWT (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/8 https://www.apeuni.com/en/practice/answer_item?...',
        'Write Essay': 'Desktop: WE#[số] hoặc WE (C)#[số] APEUni AI Score [số]/15 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: WE#[số] hoặc WE (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/15 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Spoken Text': 'Desktop: SST#[số] hoặc SST (C)#[số] APEUni AI Score [số]/10 https://www.apeuni.com/practice/answer_item?...\nMobile với xuống dòng: SST#[số] hoặc SST (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/10 https://www.apeuni.com/en/practice/answer_item?...',
        'Summarize Group Discussion': 'Desktop: SGD#[số] hoặc SGD (C)#[số] APEUni ... AI Score [số]/90 https://www.apeuni.com/practice/answer_item?model=summarize_group_discussions&answer_id=...\nMobile với xuống dòng: SGD#[số] hoặc SGD (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?model=summarize_group_discussions&answer_id=...',
        'Respond to a situation': 'Desktop: RTS#[số] hoặc RTS (C)#[số] APEUni AI Score [số]/90 https://www.apeuni.com/practice/answer_item?model=respond_situations&answer_id=...\nMobile với xuống dòng: RTS#[số] hoặc RTS (C)#[số] shared a/an answer from PTE APEUni\nAPEUni AI Score [số]/90 https://www.apeuni.com/en/practice/answer_item?model=respond_situations&answer_id=...'
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
                  }#[số] hoặc {
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  } (C)#[số] APEUni AI Score https://www.apeuni.com/practice/answer_item?...
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
                  }#[số] hoặc {
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  } (C)#[số] shared a/an answer from PTE APEUni<br />APEUni AI Score https://www.apeuni.com/en/practice/answer_item?...
                </p>
                <textarea
                  name="links"
                  className="w-full h-64 border border-[#fedac2] rounded px-3 py-2 text-black"
                  placeholder={`Example (Desktop - Định dạng cũ):\n${
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
                  }\n\nExample (Desktop - Định dạng mới với (C)):\n${
                    selectedHomeworkType === 'Read aloud' ? 'RA' : 
                    selectedHomeworkType === 'Retell lecture' ? 'RL' : 
                    selectedHomeworkType === 'Describe image' ? 'DI' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'RS' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'SWT' :
                    selectedHomeworkType === 'Write Essay' ? 'WE' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'SST' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'SGD' : 'RTS'
                  } (C)#${
                    selectedHomeworkType === 'Respond to a situation' ? '97' :
                    selectedHomeworkType === 'Summarize Written Text' ? '111' :
                    selectedHomeworkType === 'Write Essay' ? '73' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? '72' : '45'
                  } APEUni ${
                    selectedHomeworkType === 'Respond to a situation' ? 'RTS V1.0 ' : ''
                  }AI Score ${
                    selectedHomeworkType === 'Respond to a situation' ? '51/90' :
                    selectedHomeworkType === 'Summarize Written Text' ? '6.5/8' :
                    selectedHomeworkType === 'Write Essay' ? '14/15' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? '0/10' : '75/90'
                  } https://www.apeuni.com/practice/answer_item?model=${
                    selectedHomeworkType === 'Read aloud' ? 'read_alouds' : 
                    selectedHomeworkType === 'Retell lecture' ? 'retell_lectures' : 
                    selectedHomeworkType === 'Describe image' ? 'describe_images' : 
                    selectedHomeworkType === 'Repeat sentence' ? 'repeat_sentences' :
                    selectedHomeworkType === 'Summarize Written Text' ? 'core_swts' :
                    selectedHomeworkType === 'Write Essay' ? 'write_emails' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? 'core_ssts' :
                    selectedHomeworkType === 'Summarize Group Discussion' ? 'summarize_group_discussions' : 'respond_situations'
                  }&answer_id=${
                    selectedHomeworkType === 'Respond to a situation' ? '3637906318' :
                    selectedHomeworkType === 'Summarize Written Text' ? '3637872826' :
                    selectedHomeworkType === 'Write Essay' ? '3637874227' :
                    selectedHomeworkType === 'Summarize Spoken Text' ? '3637872048' : '3156378045'
                  }\n\nNo limit on number of submissions`}
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
