'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

interface DailyTarget {
  id: number;
  type: string;
  target: number;
  completed: number;
  source: string;
  link: string;
}

const defaultTargets: DailyTarget[] = [
  { id: 1, type: 'Read aloud', target: 20, completed: 0, source: '', link: '' },
  { id: 2, type: 'Repeat sentence', target: 20, completed: 0, source: '', link: '' },
  { id: 3, type: 'Describe image', target: 5, completed: 0, source: '', link: '' },
  { id: 4, type: 'Retell lecture', target: 5, completed: 0, source: '', link: '' },
  { id: 5, type: 'R&W: Fill in the blanks', target: 20, completed: 0, source: '', link: '' },
  { id: 6, type: 'Reoder paragraphs', target: 20, completed: 0, source: '', link: '' },
  { id: 7, type: 'Fill in the blanks', target: 20, completed: 0, source: '', link: '' },
  { id: 8, type: 'Highlight incorrect words', target: 5, completed: 0, source: '', link: '' },
  { id: 9, type: 'Write from dictation', target: 20, completed: 0, source: '', link: '' }
];

const DailyTargetSettings = () => {
  const [targets, setTargets] = useState<DailyTarget[]>(defaultTargets);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', content: '' });

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const docRef = await getDoc(doc(db, 'settings', 'dailyTargets'));
        if (docRef.exists()) {
          const data = docRef.data();
          if (data.targets) {
            // Merge Firebase data with defaults to ensure all targets exist
            const mergedTargets = defaultTargets.map(defaultTarget => {
              const existingTarget = data.targets.find((t: DailyTarget) => t.id === defaultTarget.id);
              return existingTarget ? { ...defaultTarget, ...existingTarget } : defaultTarget;
            });
            setTargets(mergedTargets);
          }
        }
      } catch (error) {
        console.error('Error fetching targets:', error);
        setMessage({ type: 'error', content: 'Lỗi khi tải dữ liệu' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargets();
  }, []);

  const handleSourceChange = (id: number, newSource: string) => {
    setTargets(targets.map(target => 
      target.id === id ? { ...target, source: newSource } : target
    ));
  };

  const handleLinkChange = (id: number, newLink: string) => {
    setTargets(targets.map(target => 
      target.id === id ? { ...target, link: newLink } : target
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      // Get current data first
      const docRef = await getDoc(doc(db, 'settings', 'dailyTargets'));
      const currentData = docRef.exists() ? docRef.data() : { targets: [] };
      const currentTargets = currentData.targets || [];

      // Update only source and link fields while preserving all other fields
      const updatedTargets = currentTargets.map((currentTarget: DailyTarget) => {
        const newTarget = targets.find(t => t.id === currentTarget.id);
        if (!newTarget) return currentTarget;

        return {
          ...currentTarget,
          source: newTarget.source,
          link: newTarget.link
        };
      });

      // Add any missing targets from the form
      targets.forEach(formTarget => {
        const exists = updatedTargets.some((t: DailyTarget) => t.id === formTarget.id);
        if (!exists) {
          updatedTargets.push({
            ...formTarget,
            completed: 0 // Initialize completed to 0 for new targets
          });
        }
      });

      // Sort targets by ID to maintain consistent order
      updatedTargets.sort((a: DailyTarget, b: DailyTarget) => a.id - b.id);

      // Save back to Firebase
      await setDoc(doc(db, 'settings', 'dailyTargets'), {
        targets: updatedTargets,
        updatedAt: new Date().toISOString()
      });

      setMessage({ type: 'success', content: 'Cập nhật thành công' });
    } catch (error) {
      console.error('Error updating targets:', error);
      setMessage({ type: 'error', content: 'Lỗi khi cập nhật' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#fc5d01]">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-4 text-[#fc5d01]">Cài đặt Daily Target</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {targets.map((target) => (
            <div key={target.id} className="flex flex-col space-y-2 p-4 border rounded-lg bg-[#fedac2] bg-opacity-20">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#fc5d01]">{target.type}</span>
                <input
                  type="text"
                  value={target.source}
                  onChange={(e) => handleSourceChange(target.id, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#fc5d01] w-48"
                  placeholder="Nguồn"
                />
              </div>
              <input
                type="url"
                value={target.link}
                onChange={(e) => handleLinkChange(target.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
                placeholder="Đường dẫn (có thể để trống)"
              />
            </div>
          ))}
        </div>

        {message.content && (
          <div
            className={`p-3 rounded ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.content}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg bg-[#fc5d01] text-white hover:bg-[#fd7f33] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      </form>
    </div>
  );
};

export default DailyTargetSettings;
