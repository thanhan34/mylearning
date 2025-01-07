'use client';

import { useState } from 'react';
import { db } from '../../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import type { Assignment } from '../../../../types/one-on-one';

interface AssignmentFormProps {
  studentId: string;
  onAssign: () => void;
  onCancel: () => void;
}

export default function AssignmentForm({ studentId, onAssign, onCancel }: AssignmentFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const assignmentsRef = collection(db, 'assignments');
      const newAssignment: Omit<Assignment, 'id'> = {
        studentId,
        title,
        description,
        dueDate: new Date(dueDate).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(assignmentsRef, newAssignment);
      onAssign();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-[#fc5d01]">New Assignment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-lg"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
