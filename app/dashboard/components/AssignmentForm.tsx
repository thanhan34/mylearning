'use client';

import { useState, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { AssignmentFormData } from '../../../types/assignment';

interface AssignmentFormProps {
  teacherId: string;
  targetId?: string;
  onAssign: () => void;
  onCancel: () => void;
}

export default function AssignmentForm({ teacherId, targetId, onAssign, onCancel }: AssignmentFormProps) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [targetType, setTargetType] = useState<'class' | 'group' | 'individual'>('class');
  const [customTargetId, setCustomTargetId] = useState(targetId || '');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const storageRef = ref(storage, `assignments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let attachmentUrls: string[] = [];
      if (files.length > 0) {
        attachmentUrls = await uploadFiles(files);
      }

      const assignmentsRef = collection(db, 'assignments');
      const newAssignment = {
        title,
        instructions,
        attachments: attachmentUrls,
        dueDate: new Date(dueDate).toISOString(),
        createdAt: new Date().toISOString(),
        teacherId,
        targetType,
        targetId: targetId || customTargetId,
        status: 'active',
        notificationSent: false
      };

      await addDoc(assignmentsRef, newAssignment);
      onAssign();
    } catch (error) {
      console.error('Error creating assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4 text-[#fc5d01]">New Assignment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
              rows={4}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assignment Type</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as AssignmentFormData['targetType'])}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
                required
                disabled={!!targetId}
              >
                <option value="class">Entire Class</option>
                <option value="group">Group</option>
                <option value="individual">Individual Student</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target ID</label>
              <input
                type="text"
                value={targetId || customTargetId}
                onChange={(e) => setCustomTargetId(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
                placeholder={`Enter ${targetType} ID`}
                required
                disabled={!!targetId}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#fedac2] focus:border-[#fc5d01]"
              required
              min={new Date().toISOString().split('.')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Attachments</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-[#fc5d01] text-[#fc5d01] rounded-lg hover:bg-[#fedac2] transition-colors"
              >
                Choose Files
              </button>
              <span className="text-sm text-gray-600">
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </span>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#fc5d01] text-white px-6 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
