module.exports = [
  {}, { role: 'student' }, { role: 'student', classId: 'legacy' },
  { role: 'student', teacherId: 'legacy' }, { role: 'student', classId: '', teacherId: '' },
  ...['pending', 'approved', 'rejected', null, undefined].map(approvalStatus => ({ role: 'student', approvalStatus, classId: 'legacy' })),
  ...['admin', 'admin_support', 'teacher', 'assistant', 'unknown', null].map(role => ({ role, approvalStatus: 'pending' })),
  { role: 'student', name: 'Nguy\u1ec5n V\u0103n An', email: 'nguyen.an@example.com' },
  { role: 'student', name: 'Nguyen Van An', email: 'nguyen.an@example.com' },
  { role: 'teacher', name: 'A  B', email: 'xyz@example.com', assignedFeedbackTypes: ['Read aloud'] },
  { role: 'student', name: null, email: null }, { role: 'student', name: 0, email: 0 },
  { role: 'student', name: '\ud83d\ude00\ud800', email: '\udc00@example.com' },
  { role: 'student', name: 'e\u0301', email: 'x' }, { role: 'student', name: '\u00e9', email: 'x' },
  { role: 'student', classId: null, teacherId: 1 },
];