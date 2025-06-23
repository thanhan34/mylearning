export interface MispronouncedWord {
  id: string;
  word: string;
  studentId: string;
  studentName: string;
  classId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WordStatistic {
  id: string; // word itself as ID
  word: string;
  totalCount: number;
  lastUpdated: string;
}

export interface PersonalWordCount {
  id?: string; // Document ID for deletion
  word: string;
  count: number;
  lastAdded: string;
}
