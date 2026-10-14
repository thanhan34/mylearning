'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RiShieldUserLine, RiTeamLine, RiChatCheckLine, RiFlagLine, RiCalendarCheckLine, RiArrowRightLine, RiArrowRightSLine } from 'react-icons/ri';
import AccountManagement from '@/components/AccountManagement';
import FeedbackWorkspace from '@/components/FeedbackWorkspace';
import DailyTargetSettings from './DailyTargetSettings';
import { useLearningAccount } from '@/components/LearningGate';
import AdminSupportPreview from '@/components/AdminSupportPreview';
const sections = [
  { value: 'accounts', label: 'Tài khoản & phân quyền', description: 'Duyệt học viên, quản lý vai trò và phân công.', icon: RiShieldUserLine },
  { value: 'feedback', label: 'Bài tập & feedback', description: 'Theo dõi bài nộp và kiểm tra nhận xét.', icon: RiChatCheckLine },
  { value: 'targets', label: 'Mục tiêu hàng ngày', description: 'Cập nhật nguồn và liên kết luyện tập.', icon: RiFlagLine },
  { value: 'attendance', label: 'Chấm công', description: 'Đối chiếu hoạt động và chi tiết kỳ công.', icon: RiCalendarCheckLine },
];
export default function AdminDashboardClient() {
  const [tab, setTab] = useState('accounts');
  const account = useLearningAccount();
  const activeSection = sections.find(section => section.value === tab) || sections[0];
  if (account?.role !== 'admin') return <p role="alert">Không có quyền truy cập.</p>;
  return <div className="admin-dashboard space-y-6">
    <header className="admin-dashboard-hero relative overflow-hidden p-6 sm:p-8">
      <div className="admin-hero-content relative z-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-gray-600">PTE Intensive <span className="mx-2 text-primary" aria-hidden="true">/</span> Admin</p><span className="admin-dashboard-badge"><RiShieldUserLine aria-hidden="true" className="h-4 w-4 text-primary" /> Quản trị hệ thống</span></div>
      <div className="flex items-center justify-between gap-8"><div className="max-w-2xl min-w-0"><p className="mb-2 text-sm font-medium text-gray-600">Xin chào{account.name ? `, ${account.name}` : ''}.</p><h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Trung tâm quản trị</h1><p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">Quản lý tài khoản, theo dõi chất lượng phản hồi và kiểm tra hoạt động giảng dạy tại một nơi.</p>
        <div className="admin-hero-actions mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => { setTab('accounts'); document.getElementById('admin-workspace')?.scrollIntoView({ block: 'start' }); }} className="ui-button admin-secondary-action inline-flex items-center justify-center gap-2 text-sm font-semibold"><RiShieldUserLine aria-hidden="true" className="h-5 w-5 text-primary" /> Quản trị hệ thống</button><Link href="/dashboard/teacher/students" className="ui-button admin-primary-action inline-flex items-center justify-center gap-2 text-sm font-semibold"><RiTeamLine aria-hidden="true" className="h-5 w-5" /> Danh sách học viên <RiArrowRightLine aria-hidden="true" className="h-4 w-4" /></Link></div></div>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 280 200" className="admin-hero-illustration hidden w-64 shrink-0 lg:block">
          <circle cx="150" cy="100" r="96" fill="var(--admin-peach)" opacity=".45" />
          <rect x="28" y="30" width="224" height="144" rx="16" fill="white" stroke="var(--admin-border)" />
          <path d="M28 64h224" stroke="var(--admin-border)" /><circle cx="44" cy="47" r="4" fill="var(--primary-color)" /><rect x="56" y="43" width="64" height="8" rx="4" fill="var(--admin-peach)" />
          <rect x="44" y="80" width="52" height="76" rx="8" fill="var(--admin-muted-surface)" /><circle cx="70" cy="100" r="10" fill="var(--admin-peach)" /><path d="M56 126q14-20 28 0" fill="var(--primary-color)" /><rect x="56" y="139" width="28" height="5" rx="2" fill="var(--admin-peach)" />
          <path d="M112 155h122" stroke="var(--admin-border)" /><rect x="122" y="123" width="20" height="32" rx="4" fill="var(--admin-peach)" /><rect x="157" y="104" width="20" height="51" rx="4" fill="var(--admin-peach)" /><rect x="192" y="83" width="20" height="72" rx="4" fill="var(--primary-color)" />
          <rect x="207" y="148" width="56" height="40" rx="12" fill="var(--admin-surface)" stroke="var(--admin-border)" /><path d="m222 168 8 7 15-16" fill="none" stroke="var(--primary-color)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      </div>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="admin-dashboard-navigation min-w-0" aria-label="Điều hướng quản trị">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Không gian quản lý</h2><span className="text-xs tabular-nums text-gray-500">{String(sections.length).padStart(2, '0')} mục</span></div>
        <details className="admin-management-menu" open><summary className="admin-menu-toggle">Menu quản lý <RiArrowRightSLine aria-hidden="true" className="h-4 w-4" /></summary>
        <div role="group" aria-label="Quản trị" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {sections.map(section => <button key={section.value} id={`admin-section-${section.value}`} type="button" aria-pressed={tab === section.value} aria-controls="admin-workspace" onClick={() => setTab(section.value)} className="admin-section-button group">
            <span className="admin-section-icon"><section.icon aria-hidden="true" className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-relaxed text-gray-900">{section.label}</span><span className="mt-1 block text-xs leading-relaxed text-gray-600">{section.description}</span>{tab === section.value && <span className="mt-2 block text-xs font-semibold text-gray-700">Đang xem</span>}</span>
            <RiArrowRightSLine aria-hidden="true" className="mt-2 h-4 w-4 shrink-0 text-gray-400 group-hover:text-primary" />
          </button>)}
        </div></details>
        <p className="admin-sidebar-tip mt-4 hidden p-4 text-xs leading-relaxed text-gray-600 lg:block">Chọn một mục để quản lý. Các thao tác và bộ lọc nằm trong khu vực bên phải.</p>
      </aside>
      <section id="admin-workspace" aria-labelledby={`admin-section-${activeSection.value}`} className="admin-workspace min-w-0">
        <div className="admin-workspace-heading flex items-start gap-3 p-4 sm:p-6">
          <span className="admin-dashboard-icon"><activeSection.icon aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="mb-1 text-xs font-medium text-gray-500">Khu vực quản trị</p><h2 className="text-lg font-semibold tracking-tight text-gray-900">{activeSection.label}</h2><p className="mt-1 text-sm leading-relaxed text-gray-600">{activeSection.description}</p></div>
        </div>
        <div className="p-4 sm:p-6">
          {tab === 'accounts' ? <AccountManagement /> : tab === 'feedback' ? <FeedbackWorkspace /> : tab === 'attendance' ? <AdminSupportPreview initialTab="attendance" audience="admin" /> : <DailyTargetSettings />}
        </div>
      </section>
    </div>
  </div>;
}
