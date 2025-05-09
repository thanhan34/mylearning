'use client';

import { useSession } from 'next-auth/react';

export default function WelcomeHeader() {
  const { data: session } = useSession();

  return (
    <div className="bg-gradient-to-br from-white to-[#fedac2] rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#fc5d01] mb-1 sm:mb-2">
            Xin chào, {session?.user?.name || 'Admin'}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Quản trị viên
          </p>
          <p className="text-gray-600 mt-1 sm:mt-2 max-w-2xl text-sm sm:text-base">
            Quản lý hệ thống và theo dõi hoạt động của giảng viên và học viên. Xem thống kê, quản lý tài khoản và cài đặt hệ thống.
          </p>
        </div>
        <div className="flex items-center space-x-4 self-start sm:self-auto">
          <p className="text-[#fc5d01] font-medium text-sm sm:text-base">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
