'use client';

import Navigation from "../components/Navigation";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import LearningGate, { useLearningAccount } from '@/components/LearningGate';
import { MOCK_ENABLED } from '@/lib/mock/config';
import { RiInformationLine } from 'react-icons/ri';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-[#fc5d01] text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return <LearningGate><DashboardFrame>{children}</DashboardFrame></LearningGate>;
}

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const account = useLearningAccount();
  const pathname = usePathname();
  const isAdminDashboard = account?.role === 'admin' && (pathname === '/dashboard' || pathname === '/dashboard/admin');
  const isStudentDirectory = !!account && ['admin', 'teacher', 'assistant'].includes(account.role) && pathname === '/dashboard/teacher/students';
  const isStaffDashboard = !!account && ['teacher', 'assistant'].includes(account.role) && (pathname === '/dashboard' || pathname === '/dashboard/teacher');
  const isAttendanceGuide = !!account && ['admin', 'teacher', 'assistant'].includes(account.role) && pathname === '/dashboard/teacher/attendance-guide';
  const isTeacherMocktest = !!account && ['teacher', 'assistant'].includes(account.role) && pathname === '/dashboard/mocktest/teacher';
  const isBrightWorkspace = isAdminDashboard || isStudentDirectory || isStaffDashboard || isAttendanceGuide || isTeacherMocktest;
  return (
    <div className={`min-h-screen bg-[#ffffff] relative ${isBrightWorkspace ? 'admin-app-shell' : ''} ${isStudentDirectory ? 'directory-app-shell' : ''}`}>
      <Navigation />
      <main className="max-w-7xl mx-auto py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6 lg:px-8 relative z-0">
        {MOCK_ENABLED && <p role="status" className={`mb-4 rounded-xl border border-primary-light bg-primary-light p-4 text-sm text-gray-700 ${isBrightWorkspace ? 'admin-system-notice' : ''}`}>
          {isBrightWorkspace && <RiInformationLine aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />}<span>MOCK DATA · Dữ liệu chỉ nằm trong bộ nhớ server local. Khởi động lại server để khôi phục dữ liệu mẫu. Đăng xuất để đổi tài khoản demo.</span>
        </p>}
        {children}
      </main>
    </div>
  );
}
