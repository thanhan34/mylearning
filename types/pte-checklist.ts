import { Timestamp } from 'firebase/firestore';

export interface PTEChecklistItem {
  id: string;
  name: string;
  category: 'speaking' | 'writing' | 'reading' | 'listening';
  order: number;
}

export interface PTEChecklistProgress {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: {
    [itemId: string]: {
      studentCompleted: boolean;
      teacherApproved: boolean;
      notes: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: Timestamp;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const PTE_CHECKLIST_ITEMS: PTEChecklistItem[] = [
  // Speaking Section
  { id: 'read-aloud', name: 'Read Aloud', category: 'speaking', order: 1 },
  { id: 'repeat-sentence', name: 'Repeat Sentence', category: 'speaking', order: 2 },
  { id: 'describe-image', name: 'Describe Image', category: 'speaking', order: 3 },
  { id: 'retell-lecture', name: 'Re-tell Lecture', category: 'speaking', order: 4 },
  { id: 'answer-short-question', name: 'Answer Short Question', category: 'speaking', order: 5 },
  
  // Writing Section
  { id: 'summarize-written-text', name: 'Summarize Written Text', category: 'writing', order: 6 },
  { id: 'write-essay', name: 'Write Essay', category: 'writing', order: 7 },
  
  // Reading Section
  { id: 'reading-writing-blanks', name: 'Reading & Writing: Fill in the Blanks', category: 'reading', order: 8 },
  { id: 'multiple-choice-multiple', name: 'Multiple Choice (Multiple Answers)', category: 'reading', order: 9 },
  { id: 'reorder-paragraphs', name: 'Re-order Paragraphs', category: 'reading', order: 10 },
  { id: 'reading-blanks', name: 'Reading: Fill in the Blanks', category: 'reading', order: 11 },
  { id: 'multiple-choice-single', name: 'Multiple Choice (Single Answer)', category: 'reading', order: 12 },
  
  // Listening Section
  { id: 'summarize-spoken-text', name: 'Summarize Spoken Text', category: 'listening', order: 13 },
  { id: 'listening-multiple-choice-multiple', name: 'Multiple Choice (Multiple Answers)', category: 'listening', order: 14 },
  { id: 'listening-blanks', name: 'Fill in the Blanks', category: 'listening', order: 15 },
  { id: 'highlight-correct-summary', name: 'Highlight Correct Summary', category: 'listening', order: 16 },
  { id: 'listening-multiple-choice-single', name: 'Multiple Choice (Single Answer)', category: 'listening', order: 17 },
  { id: 'select-missing-word', name: 'Select Missing Word', category: 'listening', order: 18 },
  { id: 'highlight-incorrect-words', name: 'Highlight Incorrect Words', category: 'listening', order: 19 },
  { id: 'write-from-dictation', name: 'Write from Dictation', category: 'listening', order: 20 }
];
