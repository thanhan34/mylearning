'use client';

import { useRouter } from 'next/navigation';

export default function NewStudentGuide() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex items-center space-x-4 text-[#fc5d01] mb-8">
          <div className="bg-[#fedac2] p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-medium">Hướng dẫn bắt đầu</h3>
            <p className="text-sm text-gray-600">Các bước cần thực hiện trước khi nộp bài</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Update Section */}
          <div className="bg-[#fff] rounded-xl p-6 border border-[#fedac2]">
            <h4 className="text-lg font-medium text-[#fc5d01] mb-4">Cập nhật thông tin cá nhân</h4>
            <div className="space-y-3 text-gray-600 mb-4">
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-[#fedac2] text-[#fc5d01] flex items-center justify-center text-sm mr-3">1</span>
                Cập nhật ảnh đại diện
              </p>
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-[#fedac2] text-[#fc5d01] flex items-center justify-center text-sm mr-3">2</span>
                Cập nhật mục tiêu điểm số (Target)
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="w-full bg-[#fc5d01] text-white px-6 py-3 rounded-lg hover:bg-[#fd7f33] transition-colors text-base font-medium"
            >
              Đi đến trang cá nhân
            </button>
          </div>

          {/* Class Join Section */}
          <div className="bg-[#fff] rounded-xl p-6 border border-[#fedac2]">
            <h4 className="text-lg font-medium text-[#fc5d01] mb-4">Tham gia lớp học</h4>
            <div className="space-y-3 text-gray-600 mb-6">
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-[#fedac2] text-[#fc5d01] flex items-center justify-center text-sm mr-3">1</span>
                Liên hệ admin hoặc giáo viên
              </p>
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-[#fedac2] text-[#fc5d01] flex items-center justify-center text-sm mr-3">2</span>
                Yêu cầu được thêm vào lớp học
              </p>
              <p className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-[#fedac2] text-[#fc5d01] flex items-center justify-center text-sm mr-3">3</span>
                Sau khi được thêm vào lớp, bạn có thể bắt đầu nộp bài tập
              </p>
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://www.facebook.com/pteintensive" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-[#fedac2] text-[#fc5d01] px-4 py-3 rounded-lg hover:bg-[#fdbc94] transition-colors flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook Page</span>
              </a>
              <a 
                href="https://www.facebook.com/groups/pteintensive" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-[#fedac2] text-[#fc5d01] px-4 py-3 rounded-lg hover:bg-[#fdbc94] transition-colors flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                <span>Facebook Group</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
