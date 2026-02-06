import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config';
import { Class } from './types';

interface MissingHomeworkParams {
  classes: Class[];
  timeframeDays: number;
  allowedClassIds?: string[];
  selectedTeacher?: string;
  selectedClass?: string;
}

export interface MissingHomeworkStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  teacherId: string;
  lastSubmissionDate: string | null;
  daysSinceLastSubmission: number | null;
}

const hasValidSubmission = (submissions: any[]): boolean => {
  if (!Array.isArray(submissions)) return false;
  return submissions.some((item) => {
    if (!item || typeof item !== 'object') return false;
    return typeof item.link === 'string' && item.link.trim() !== '';
  });
};

const getDateDiffInDays = (dateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)));
};

export const getMissingHomeworkStudents = async ({
  classes,
  timeframeDays,
  allowedClassIds,
  selectedTeacher = 'all',
  selectedClass = 'all',
}: MissingHomeworkParams): Promise<MissingHomeworkStudent[]> => {
  const filteredClasses = classes.filter((classData) => {
    if (allowedClassIds && allowedClassIds.length > 0 && !allowedClassIds.includes(classData.id)) {
      return false;
    }

    if (selectedClass !== 'all' && classData.id !== selectedClass) {
      return false;
    }

    if (selectedTeacher !== 'all' && classData.teacherId !== selectedTeacher) {
      return false;
    }

    return true;
  });

  if (filteredClasses.length === 0) {
    return [];
  }

  const studentMap = new Map<string, { studentName: string; studentEmail: string; classId: string; className: string; teacherId: string }>();
  filteredClasses.forEach((classData) => {
    (classData.students || []).forEach((student) => {
      studentMap.set(student.id, {
        studentName: student.name || student.email || 'Unknown Student',
        studentEmail: student.email || '',
        classId: classData.id,
        className: classData.name || `Class ${classData.id}`,
        teacherId: classData.teacherId,
      });
    });
  });

  if (studentMap.size === 0) {
    return [];
  }

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - timeframeDays);
  const thresholdString = thresholdDate.toISOString().split('T')[0];

  const activeStudentSet = new Set<string>();
  const recentHomeworkQuery = query(
    collection(db, 'homework'),
    where('date', '>=', thresholdString),
    orderBy('date', 'desc'),
    limit(500)
  );

  const recentHomeworkSnapshot = await getDocs(recentHomeworkQuery);
  recentHomeworkSnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const userId = data.userId as string;
    if (!studentMap.has(userId)) {
      return;
    }

    if (hasValidSubmission(data.submissions || [])) {
      activeStudentSet.add(userId);
    }
  });

  const latestSubmissionByStudent = new Map<string, string>();
  const latestHomeworkQuery = query(
    collection(db, 'homework'),
    orderBy('date', 'desc'),
    limit(1000)
  );

  const latestHomeworkSnapshot = await getDocs(latestHomeworkQuery);
  latestHomeworkSnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const userId = data.userId as string;

    if (!studentMap.has(userId) || latestSubmissionByStudent.has(userId)) {
      return;
    }

    if (hasValidSubmission(data.submissions || [])) {
      latestSubmissionByStudent.set(userId, data.date as string);
    }
  });

  const missingStudents: MissingHomeworkStudent[] = [];
  studentMap.forEach((studentInfo, studentId) => {
    if (activeStudentSet.has(studentId)) {
      return;
    }

    const lastSubmissionDate = latestSubmissionByStudent.get(studentId) || null;
    missingStudents.push({
      studentId,
      studentName: studentInfo.studentName,
      studentEmail: studentInfo.studentEmail,
      classId: studentInfo.classId,
      className: studentInfo.className,
      teacherId: studentInfo.teacherId,
      lastSubmissionDate,
      daysSinceLastSubmission: lastSubmissionDate ? getDateDiffInDays(lastSubmissionDate) : null,
    });
  });

  return missingStudents.sort((a, b) => {
    if (a.daysSinceLastSubmission === null && b.daysSinceLastSubmission === null) return 0;
    if (a.daysSinceLastSubmission === null) return -1;
    if (b.daysSinceLastSubmission === null) return 1;
    return b.daysSinceLastSubmission - a.daysSinceLastSubmission;
  });
};
