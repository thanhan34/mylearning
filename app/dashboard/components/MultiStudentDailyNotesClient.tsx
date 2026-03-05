'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { getDailyNotesForStudents, DailyNote } from '@/app/firebase/services/daily-notes';
import { Class } from '@/app/firebase/services/types';
import { User, getUserByEmail } from '@/app/firebase/services/user';
import { getAssistantClasses, getTeacherClasses } from '@/app/firebase/services/class';

interface MultiStudentDailyNotesClientProps {
  userRole: 'admin' | 'teacher' | 'assistant';
}

interface StudentOption {
  id: string;
  name: string;
}

export default function MultiStudentDailyNotesClient({ userRole }: MultiStudentDailyNotesClientProps) {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loadingScope, setLoadingScope] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    const loadScope = async () => {
      if (!session?.user?.email) return;

      setLoadingScope(true);
      try {
        const currentUser = await getUserByEmail(session.user.email);
        if (!currentUser) return;

        let scopedClasses: Class[] = [];

        if (userRole === 'admin') {
          const classSnapshot = await getDocs(collection(db, 'classes'));
          scopedClasses = classSnapshot.docs.map((classDoc) => ({
            id: classDoc.id,
            ...classDoc.data(),
          })) as Class[];
        } else if (userRole === 'teacher') {
          scopedClasses = await getTeacherClasses(session.user.email);
          setSelectedTeacher(currentUser.id);
        } else {
          scopedClasses = await getAssistantClasses(session.user.email);
        }

        setClasses(scopedClasses);

        const teachersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
        const allTeachers = teachersSnapshot.docs.map((teacherDoc) => ({
          id: teacherDoc.id,
          ...teacherDoc.data(),
        })) as User[];

        if (userRole === 'admin') {
          setTeachers(allTeachers);
        } else {
          const allowedTeacherIds = new Set(scopedClasses.map((classData) => classData.teacherId));
          setTeachers(allTeachers.filter((teacher) => allowedTeacherIds.has(teacher.id)));
        }
      } catch (error) {
        console.error('Error loading daily notes scope:', error);
      } finally {
        setLoadingScope(false);
      }
    };

    loadScope();
  }, [session, userRole]);

  const filteredClasses = useMemo(() => {
    return classes.filter((classData) => {
      if (selectedTeacher !== 'all' && classData.teacherId !== selectedTeacher) return false;
      if (selectedClass !== 'all' && classData.id !== selectedClass) return false;
      return true;
    });
  }, [classes, selectedTeacher, selectedClass]);

  const studentOptions = useMemo<StudentOption[]>(() => {
    const studentMap = new Map<string, StudentOption>();

    filteredClasses.forEach((classData) => {
      (classData.students || []).forEach((student) => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            name: student.name || student.email,
          });
        }
      });
    });

    return Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredClasses]);

  useEffect(() => {
    const loadNotes = async () => {
      setLoadingNotes(true);
      try {
        const studentIds =
          selectedStudent === 'all'
            ? studentOptions.map((student) => student.id)
            : [selectedStudent];

        if (!studentIds.length) {
          setNotes([]);
          return;
        }

        const loadedNotes = await getDailyNotesForStudents(studentIds, 500);
        setNotes(loadedNotes);
      } catch (error) {
        console.error('Error loading daily notes:', error);
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };

    if (!loadingScope) {
      loadNotes();
    }
  }, [studentOptions, selectedStudent, loadingScope]);

  const teacherMap = useMemo(() => {
    return new Map(teachers.map((teacher) => [teacher.id, teacher.name || teacher.email]));
  }, [teachers]);

  const classNameByStudentId = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((classData) => {
      (classData.students || []).forEach((student) => {
        map.set(student.id, classData.name || `Class ${classData.id}`);
      });
    });
    return map;
  }, [classes]);

  const displayNotes = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return notes;

    return notes.filter((note) =>
      [note.studentName, note.content, note.whatLearned, note.whatToPractice]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [notes, searchKeyword]);

  if (loadingScope) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-[#fc5d01] mb-1">📝 Nhật ký học tập nhiều học viên</h1>
        <p className="text-sm text-gray-600">Xem nhật ký học tập theo lớp, học viên và từ khóa nội dung.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {userRole === 'admin' && (
            <select
              value={selectedTeacher}
              onChange={(e) => {
                setSelectedTeacher(e.target.value);
                setSelectedClass('all');
                setSelectedStudent('all');
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
            >
              <option value="all">Tất cả giảng viên</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name || teacher.email}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudent('all');
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
          >
            <option value="all">Tất cả lớp</option>
            {classes
              .filter((classData) => selectedTeacher === 'all' || classData.teacherId === selectedTeacher)
              .map((classData) => (
                <option key={classData.id} value={classData.id}>
                  {classData.name}
                </option>
              ))}
          </select>

          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
          >
            <option value="all">Tất cả học viên</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>

          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo nội dung nhật ký..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        {loadingNotes ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
          </div>
        ) : displayNotes.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Không có nhật ký phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <div className="space-y-4">
            {displayNotes.map((note) => (
              <div key={note.id} className="border border-[#fedac2] rounded-xl p-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm">
                  <span className="font-semibold text-[#fc5d01]">👤 {note.studentName}</span>
                  <span className="text-gray-600">🏫 {classNameByStudentId.get(note.studentId) || 'Chưa có lớp'}</span>
                  <span className="text-gray-600">👨‍🏫 {teacherMap.get(note.teacherId) || 'Giảng viên'}</span>
                  <span className="text-gray-600">📅 {new Date(note.date).toLocaleDateString('vi-VN')}</span>
                </div>

                {note.content && <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>}

                {note.whatLearned && (
                  <div className="mt-2 bg-green-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    <span className="font-semibold text-green-700">Đã học được:</span> {note.whatLearned}
                  </div>
                )}

                {note.whatToPractice && (
                  <div className="mt-2 bg-blue-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    <span className="font-semibold text-blue-700">Cần luyện tập:</span> {note.whatToPractice}
                  </div>
                )}

                {note.images && note.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {note.images.map((imageUrl, index) => (
                      <a key={index} href={imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={imageUrl}
                          alt={`Nhật ký ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-[#fc5d01]"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}