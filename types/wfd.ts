import { Timestamp } from 'firebase/firestore';

export interface WFDSentence {
  id: string;
  text: string;
  audio: {
    Brian: string;
    Joanna: string;
    Olivia: string;
  };
  isHidden: boolean;
  occurrence: number;
  questionType: string;
  createdAt: string;
}

export interface WFDProgress {
  id?: string;
  userId: string;
  wfdId: string;
  correctAttempts: number;
  completedAt?: string;
  dailyDate: string;
  attempts: WFDAttempt[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WFDAttempt {
  timestamp: string;
  userInput: string;
  isCorrect: boolean;
  accuracy: number;
}

export interface WFDDailySession {
  id?: string;
  userId: string;
  date: string;
  sentences: string[]; // Array of WFD sentence IDs
  completedSentences: string[];
  totalProgress: number; // 0-100%
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type VoiceType = 'Brian' | 'Joanna' | 'Olivia';
