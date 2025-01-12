'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface DailyTarget {
  id: number;
  type: string;
  target: number;
  completed: number;
  source: string;
  link: string;
}

const defaultTargets: DailyTarget[] = [
  { id: 1, type: 'Read aloud', target: 20, completed: 15, source: 'Shadowing', link: '' },
  { id: 2, type: 'Repeat sentence', target: 20, completed: 18, source: 'PTE Repeat Sentence', link: '' },
  { id: 3, type: 'Describe image', target: 5, completed: 3, source: '', link: '' },
  { id: 4, type: 'Retell lecture', target: 5, completed: 2, source: '', link: '' },
  { id: 5, type: 'R&W: Fill in the blanks', target: 20, completed: 12, source: '', link: '' },
  { id: 6, type: 'Reoder paragraphs', target: 20, completed: 15, source: '', link: '' },
  { id: 7, type: 'Fill in the blanks', target: 20, completed: 16, source: '', link: '' },
  { id: 8, type: 'Highlight incorrect words', target: 5, completed: 3, source: '', link: '' },
  { id: 9, type: 'Write from dictation', target: 20, completed: 14, source: 'PTE Write From Dictation', link: '' }
];

const DailyTargetTable = () => {
  const [targets, setTargets] = useState<DailyTarget[]>(defaultTargets);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        console.log('Fetching targets from Firebase...');
        const docRef = await getDoc(doc(db, 'settings', 'dailyTargets'));
        console.log('Document exists:', docRef.exists());
        
        if (docRef.exists()) {
          const data = docRef.data();
          console.log('Firebase data:', data);
          
          if (data.targets) {
            console.log('Setting targets:', data.targets);
            // Ensure all required fields exist
            const mergedTargets = defaultTargets.map(defaultTarget => {
              const firebaseTarget = data.targets.find((t: any) => t.id === defaultTarget.id);
              if (!firebaseTarget) return defaultTarget;

              // Ensure all fields exist with defaults if missing
              return {
                id: defaultTarget.id,
                type: defaultTarget.type,
                target: defaultTarget.target,
                completed: defaultTarget.completed,
                source: firebaseTarget.source || defaultTarget.source || '',
                link: firebaseTarget.link || defaultTarget.link || ''
              };
            });
            setTargets(mergedTargets);
          }
        }
      } catch (error) {
        console.error('Error fetching targets:', error);
        setError('Lỗi khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargets();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#fc5d01]">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-[#fc5d01]">Daily Targets</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[#fedac2]">
              <th className="py-2 px-4 text-left text-[#fc5d01]">NO</th>
              <th className="py-2 px-4 text-left text-[#fc5d01]">TYPE</th>
              <th className="py-2 px-4 text-left text-[#fc5d01]">Target</th>
              <th className="py-2 px-4 text-left text-[#fc5d01]">Source</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-b border-[#fedac2] hover:bg-[#fedac2] hover:bg-opacity-10">
                <td className="py-2 px-4">{target.id}</td>
                <td className="py-2 px-4">{target.type}</td>
                <td className="py-2 px-4">{target.target}</td>
                <td className="py-2 px-4">
                  {target.link ? (
                    <a 
                      href={target.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#fc5d01] hover:text-[#fd7f33] underline"
                    >
                      {target.source}
                    </a>
                  ) : (
                    target.source || '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyTargetTable;
