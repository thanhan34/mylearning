'use client';
import { useState } from 'react';
import { Tabs } from '@/components/ui';
import AccountManagement from '@/components/AccountManagement';
import AttendanceAudit from '@/components/AttendanceAudit';
import FeedbackWorkspace from '@/components/FeedbackWorkspace';

export default function AdminSupportPreview({ initialTab = 'students', audience = 'support' }: {
  initialTab?: 'students' | 'feedback' | 'attendance'; audience?: 'admin' | 'support';
} = {}) {
  const [tab, setTab] = useState<string>(initialTab);
  return <div className="space-y-6">
    <Tabs label="Kiểm duyệt & chấm công" value={tab} onChange={setTab} items={[
      { value: 'students', label: 'Duyệt học viên' },
      { value: 'feedback', label: 'Kiểm duyệt feedback' },
      { value: 'attendance', label: 'Chấm công & chi tiết' },
    ]} />
    {tab === 'feedback' ? <FeedbackWorkspace /> : tab === 'attendance' ? <AttendanceAudit /> : <>
      <h1 className="text-2xl font-bold text-primary">{audience === 'admin' ? 'Admin' : 'Hỗ trợ admin'} · Duyệt học viên</h1>
      <AccountManagement approvalOnly />
    </>}
  </div>;
}