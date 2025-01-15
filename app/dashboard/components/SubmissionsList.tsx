'use client';

import { HomeworkSubmission } from '@/app/firebase/services';

interface SubmissionsListProps {
  selectedDate: string;
  submissionDates: { [key: string]: number };
  submissions: HomeworkSubmission[];
}

export default function SubmissionsList({ selectedDate, submissionDates, submissions }: SubmissionsListProps) {
  if (!selectedDate) return null;
  
  if (!submissions?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Không có bài tập nào cho ngày này
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="space-y-4">
        {Object.entries(
          submissions.reduce((acc: { [key: string]: HomeworkSubmission[] }, submission: HomeworkSubmission) => {
            if (!acc[submission.type]) {
              acc[submission.type] = [];
            }
            acc[submission.type].push(submission);
            return acc;
          }, {} as { [key: string]: HomeworkSubmission[] })
        ).map(([type, typeSubmissions]) => (
          <div key={type} className="border border-[#fedac2] rounded-lg overflow-hidden">
            <div className="bg-[#fedac2] px-4 py-2">
              <h4 className="text-[#fc5d01] font-medium">{type}</h4>
            </div>
            <div className="p-4">
              <div className="grid gap-2">
                {typeSubmissions
                  .sort((a, b) => a.questionNumber - b.questionNumber)
                  .slice(0, type === 'Read aloud' || type === 'Repeat sentence' ? 20 : 5)
                  .map((submission) => (
                    <div key={`${submission.type}_${submission.questionNumber}`} className="flex items-center gap-4">
                      <div className="w-16 text-sm">Câu {submission.questionNumber}</div>
                      <div className="flex-1">
                        {submission.link ? (
                          <a
                            href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#fc5d01] hover:text-[#fd7f33] text-sm"
                            title="Click để mở link gốc"
                          >
                            {submission.link.split('https://')[0].trim() || 'Xem bài làm'}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">Chưa nộp bài</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.feedback || 'Chưa có nhận xét'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
