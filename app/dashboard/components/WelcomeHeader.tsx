'use client';

interface WelcomeHeaderProps {
  name: string;
  role: string;
}

export default function WelcomeHeader({ name, role }: WelcomeHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-white to-[#fedac2] rounded-xl p-6 shadow-lg mb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#fc5d01]">
            Xin chào, {name}
          </h1>
          <p className="text-[#fd7f33]">
            {role === 'teacher' ? 'Giảng viên' : role === 'admin' ? 'Quản trị viên' : role === 'assistant' ? 'Trợ giảng' : 'Học viên'}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        {role === 'teacher' ? (
          'Quản lý lớp học và theo dõi tiến độ học viên của bạn'
        ) : role === 'admin' ? (
          'Quản lý hệ thống và theo dõi hoạt động của giảng viên và học viên'
        ) : role === 'assistant' ? (
          'Hỗ trợ giảng viên chấm sửa bài và theo dõi tiến độ học viên'
        ) : (
          'Theo dõi tiến độ học tập và nộp bài tập của bạn'
        )}
      </div>
    </div>
  );
}
