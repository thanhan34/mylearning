'use client';

import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { Student, SessionNote, Assignment } from '../../../types/one-on-one';
import { useSession } from 'next-auth/react';
import AssignmentForm from './components/AssignmentForm';

export default function OneOnOneManagement() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where('type', '==', 'one-on-one'));
        const querySnapshot = await getDocs(q);
        const studentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Student));
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!selectedStudent) return;

      try {
        // Fetch session notes
        const notesRef = collection(db, 'sessionNotes');
        const notesQuery = query(notesRef, where('studentId', '==', selectedStudent));
        const notesSnapshot = await getDocs(notesQuery);
        const notesData = notesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SessionNote));
        setSessionNotes(notesData);

        // Fetch assignments
        const assignmentsRef = collection(db, 'assignments');
        const assignmentsQuery = query(assignmentsRef, where('studentId', '==', selectedStudent));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Assignment));
        setAssignments(assignmentsData);
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
    };

    fetchStudentData();
  }, [selectedStudent]);

  const handleAddNote = async () => {
    if (!selectedStudent || !newNote.trim() || !session?.user?.email) return;
    
    try {
      const notesRef = collection(db, 'sessionNotes');
      const newNoteData: Omit<SessionNote, 'id'> = {
        studentId: selectedStudent,
        content: newNote.trim(),
        date: new Date().toISOString(),
        teacherId: session.user.email
      };

      await addDoc(notesRef, newNoteData);
      
      // Refresh notes
      const notesQuery = query(notesRef, where('studentId', '==', selectedStudent));
      const notesSnapshot = await getDocs(notesQuery);
      const notesData = notesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SessionNote));
      setSessionNotes(notesData);
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleAssignmentCreated = async () => {
    if (!selectedStudent) return;

    // Refresh assignments
    const assignmentsRef = collection(db, 'assignments');
    const assignmentsQuery = query(assignmentsRef, where('studentId', '==', selectedStudent));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Assignment));
    setAssignments(assignmentsData);
    setShowAssignmentForm(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#fc5d01]">One-on-One Student Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4 text-[#fd7f33]">Students</h2>
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedStudent === student.id
                    ? 'bg-[#fedac2]'
                    : 'bg-[#fdbc94] hover:bg-[#ffac7b]'
                }`}
                onClick={() => setSelectedStudent(student.id)}
              >
                <h3 className="font-semibold">{student.name}</h3>
                <p className="text-sm mt-2">Learning Goals: {student.learningGoals}</p>
                <div className="mt-2 text-sm">
                  <p>Assignments: {student.assignmentStatus.completed}/{student.assignmentStatus.total}</p>
                  <p>Average Score: {student.averageScore.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4 text-[#fd7f33]">Progress Tracking</h2>
          {selectedStudent ? (
            <div>
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Session Notes</h3>
                <div className="space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new note..."
                    className="w-full p-2 border rounded-lg"
                    rows={4}
                  />
                  <button
                    onClick={handleAddNote}
                    className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors"
                  >
                    Add Note
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {sessionNotes.map((note) => (
                    <div key={note.id} className="bg-[#fedac2] p-3 rounded-lg">
                      <p className="text-sm text-gray-600">{formatDate(note.date)}</p>
                      <p className="mt-1">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a student to view progress</p>
          )}
        </div>

        {/* Assignment Management */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4 text-[#fd7f33]">Assignments</h2>
          {selectedStudent ? (
            <div>
              <button
                onClick={() => setShowAssignmentForm(true)}
                className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors w-full mb-4"
              >
                Assign New Task
              </button>
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-[#fedac2] p-3 rounded-lg">
                    <h4 className="font-semibold">{assignment.title}</h4>
                    <p className="text-sm mt-1">{assignment.description}</p>
                    <div className="mt-2 text-sm">
                      <p>Due: {formatDate(assignment.dueDate)}</p>
                      <p>Status: {assignment.status}</p>
                      {assignment.score && <p>Score: {assignment.score}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a student to manage assignments</p>
          )}
        </div>
      </div>

      {/* Assignment Form Modal */}
      {showAssignmentForm && selectedStudent && (
        <AssignmentForm
          studentId={selectedStudent}
          onAssign={handleAssignmentCreated}
          onCancel={() => setShowAssignmentForm(false)}
        />
      )}
    </div>
  );
}
