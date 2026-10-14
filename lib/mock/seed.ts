import { EXERCISE_TYPES } from '../learning-access';
import { auditWindow, vietnamDate } from '../attendance-audit';

export type MockData = Record<string, any>;
export type MockDocuments = Record<string, MockData>;

export function createSeed(): MockDocuments {
  const now = new Date();
  const iso = now.toISOString();
  const stamp = { __mockTimestamp: now.getTime() };
  const documents: MockDocuments = {};
  const names: Record<string, string> = { admin: 'Admin Demo', admin_support: 'Hỗ trợ admin Demo', teacher: 'Giáo viên Demo', assistant: 'Trợ giảng Demo', student: 'Nguyễn Minh An', pending: 'Học viên chờ duyệt' };
  for (const [key, name] of Object.entries(names)) {
    documents[`users/mock-${key}`] = { name, email: `${key}@mock.local`, role: key === 'pending' ? 'student' : key,
      approvalStatus: key === 'pending' ? 'pending' : 'approved', createdAt: iso,
      assignedFeedbackTypes: key === 'teacher' ? [...EXERCISE_TYPES] : key === 'assistant' ? ['Read aloud', 'Repeat sentence'] : [],
      ...(key === 'student' ? { classId: 'mock-class', teacherId: 'mock-teacher' } : {}),
      ...(key === 'teacher' ? { assignedStudents: ['mock-student', 'mock-student-2'] } : {}),
      ...(key === 'assistant' ? { supportingTeacherId: 'mock-teacher', assignedClassIds: ['mock-class'] } : {}),
    };
  }
  documents['users/mock-student-2'] = { ...documents['users/mock-student'], name: 'Trần Bảo Linh', email: 'linh@mock.local' };
  documents['classes/mock-class'] = { name: 'PTE Demo 65+', teacherId: 'mock-teacher', description: 'Lớp dữ liệu mẫu local',
    schedule: 'Thứ 2 - 4 - 6, 19:00', studentCount: 2, createdAt: iso, announcements: [],
    students: ['mock-student', 'mock-student-2'].map(id => ({ id, name: documents[`users/${id}`].name, email: documents[`users/${id}`].email })),
  };
  for (let day = 0; day < 7; day++) {
    const date = new Date(now.getTime() - day * 86400000).toISOString().slice(0, 10);
    for (const userId of ['mock-student', 'mock-student-2']) {
      documents[`homework/${userId}_${date}`] = { userId, userName: documents[`users/${userId}`].name, date, timestamp: stamp,
        submissions: EXERCISE_TYPES.slice(0, 3).map((type, i) => ({ id: `${userId}-${day}-${i}`, type, questionNumber: 1, date,
          link: `https://example.com/demo/${userId}/${day}/${i}`,
          ...(i === 0 ? { feedback: 'Nhịp đọc tốt. Hãy chú ý phụ âm cuối.', feedbackBy: 'mock-teacher', feedbackByName: names.teacher, feedbackByRole: 'teacher', feedbackAt: iso } : {}),
        })),
      };
    }
  }
  documents['assignments/mock-assignment'] = { title: 'Luyện Read Aloud tuần này', instructions: 'Luyện đọc 3 đoạn và nộp kết quả.',
    dueDate: new Date(now.getTime() + 7 * 86400000).toISOString(), createdAt: iso, assignedBy: 'mock-teacher',
    assignedByName: names.teacher, assignedByRole: 'teacher', targetType: 'class', targetId: 'mock-class',
    targetStudents: ['mock-student', 'mock-student-2'], status: 'active', notificationSent: true, attachments: [], submissions: [],
  };
  documents['mocktests/mock-test'] = { studentId: 'mock-student', studentName: names.student, link: 'https://example.com/demo/mocktest', submittedAt: stamp };
  documents['notifications/mock-notification'] = { message: 'Dữ liệu demo đã sẵn sàng. Không sử dụng Firestore thật.', teacher_id: 'mock-teacher', admin_id: 'mock-admin', is_read: false, created_at: stamp };
  documents['settings/dailyTarget'] = { target: 10 };
  Object.assign(documents, createExpandedSeed(now));
  return documents;
}

// Additive fixtures, separate IDs preserve existing login accounts and demo edits.
export function createExpandedSeed(now = new Date()): MockDocuments {
  const documents: MockDocuments = {};
  const iso = now.toISOString();
  const today = vietnamDate(now);
  const names = ['Lê Hoàng Nam', 'Nguyễn Thu Hà', 'Trần Gia Huy', 'Phạm Ngọc Mai', 'Võ Minh Khang', 'Đặng Bảo Anh', 'Bùi Tuấn Kiệt', 'Đỗ Thảo Vy', 'Huỳnh Đức Anh', 'Lý Khánh Linh', 'Phan Nhật Minh', 'Mai Quỳnh Chi'];
  for (let i = 0; i < 12; i++) {
    const suffix = String(i + 1).padStart(2, '0');
    const role = i < 6 ? 'teacher' : 'assistant';
    documents[`users/mock-extra-staff-${suffix}`] = {
      name: `${role === 'teacher' ? 'GV' : 'TG'} ${names[i]} (Demo)`, email: `staff-${suffix}@mock.local`, role,
      approvalStatus: 'approved', createdAt: iso,
      assignedFeedbackTypes: i === 11 ? [] : [EXERCISE_TYPES[i % 9], EXERCISE_TYPES[(i + 1) % 9]],
    };
    documents[`users/mock-extra-student-${suffix}`] = {
      name: `${names[(i + 4) % 12]} (Học viên demo)`, email: `student-${suffix}@mock.local`, role: 'student',
      approvalStatus: i >= 10 ? 'pending' : 'approved', createdAt: iso, assignedFeedbackTypes: [],
    };
  }
  // Ten approved students submit; two pending students deliberately have no homework.
  for (let day = 0; day < 45; day++) {
    const date = new Date(Date.parse(today) - day * 86400000).toISOString().slice(0, 10);
    for (let student = 0; student < 10; student++) {
      const userId = `mock-extra-student-${String(student + 1).padStart(2, '0')}`;
      const submissions: MockData[] = [];
      const types = student === 0 ? [0, 1, 2] : [(student + day) % 9, (student + day + 1) % 9, (student + day + 2) % 9];
      for (const typeIndex of types) {
        const type = EXERCISE_TYPES[typeIndex];
        const count = student === 0 && typeIndex === 0 ? 25 : 4 + (student + typeIndex + day) % 7;
        for (let question = 1; question <= count; question++) {
          const sub: MockData = { id: `${userId}-${date}-${typeIndex}-${question}`, type, date, questionNumber: question,
            link: `https://example.com/mock-homework/${userId}/${date}/${typeIndex}/${question}` };
          const scenario = (student + question + day) % 6;
          const extraId = `mock-extra-staff-${String(typeIndex + 1).padStart(2, '0')}`;
          const author = scenario === 4 ? extraId : scenario === 3 && typeIndex < 2 ? 'mock-assistant' : 'mock-teacher';
          const at = scenario === 2 ? new Date(Date.parse(auditWindow(date).deadline) + 3600000).toISOString()
            : new Date(Math.min(now.getTime(), Date.parse(`${date}T10:00:00+07:00`))).toISOString();
          // Never seed future feedback; recent late-feedback scenarios stay pending.
          if (scenario !== 0 && Date.parse(at) <= now.getTime()) {
            const name = documents[`users/${author}`]?.name || (author === 'mock-teacher' ? 'Giáo viên Demo' : 'Trợ giảng Demo');
            Object.assign(sub, { feedback: `[DỮ LIỆU MẪU] ${type} — bài ${question}.\nĐiểm cần sửa: diễn đạt chưa rõ và còn bỏ sót chi tiết.\nCách cải thiện: xem lại đáp án, luyện từng phần rồi làm lại.\nLần sau: kiểm tra nội dung trước khi nộp.`,
              feedbackBy: author, feedbackByName: name, feedbackByRole: documents[`users/${author}`]?.role || (author === 'mock-teacher' ? 'teacher' : 'assistant'),
              ...(scenario === 5 ? {} : { feedbackAt: at }),
            });
          }
          submissions.push(sub);
        }
      }
      documents[`homework/${userId}_${date}`] = { userId, userName: documents[`users/${userId}`].name, date, submissions,
        timestamp: { __mockTimestamp: Math.min(now.getTime(), Date.parse(`${date}T09:00:00+07:00`)) } };
    }
  }
  return documents;
}