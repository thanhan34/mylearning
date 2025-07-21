import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/config';
import { redirect } from 'next/navigation';
import WFDPracticeClient from './components/WFDPracticeClient';

export const metadata: Metadata = {
  title: 'Write From Dictation - MyLearning',
  description: 'Practice Write From Dictation with audio exercises',
};

export default async function WFDPracticePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fedac2] via-white to-[#fdbc94]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#fc5d01] mb-4">
              Write From Dictation
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Luyện tập kỹ năng nghe và viết với 10 câu mới mỗi ngày. 
              Gõ chính xác mỗi câu 10 lần để hoàn thành.
            </p>
          </div>

          {/* Practice Component */}
          <WFDPracticeClient />
        </div>
      </div>
    </div>
  );
}
