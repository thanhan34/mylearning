'use client';
import { useState } from 'react';
import { Button, Card, Tabs } from '@/components/ui';
import { MOCK_ENABLED } from '@/lib/mock/config';
import AttendanceAudit from '@/components/AttendanceAudit';
import FeedbackWorkspace from '@/components/FeedbackWorkspace';

export default function AdminSupportPreview({ initialTab = 'students', audience = 'support' }: {
  initialTab?: 'students' | 'feedback' | 'attendance'; audience?: 'admin' | 'support';
} = {}) {
  const [tab, setTab] = useState<string>(initialTab);
  const [approved, setApproved] = useState(false);
  return <div className="space-y-6">
    <Tabs label="Kiểm duyệt & chấm công" value={tab} onChange={setTab} items={[
      { value: 'students', label: 'Duyệt học viên (mô phỏng)' },
      { value: 'feedback', label: 'Kiểm duyệt feedback' },
      { value: 'attendance', label: 'Chấm công & chi tiết' },
    ]} />
    {tab === 'feedback' ? <FeedbackWorkspace /> : tab === 'attendance' ? <AttendanceAudit /> : <>
      <h1 className="text-2xl font-bold text-primary">{audience === 'admin' ? 'Admin' : 'Hỗ trợ admin'} · Duyệt học viên</h1>
      {!MOCK_ENABLED ? <Card>Bản xem thử duyệt học viên chỉ có trong chế độ mock. Chấm công & chi tiết sử dụng dữ liệu bài nộp của môi trường hiện tại.</Card> : <Card className="space-y-4">
        <p className="text-sm text-gray-600">Thao tác duyệt tại đây chỉ mô phỏng, không cập nhật tài khoản trên server. Tải lại trang sẽ đặt lại thao tác. {audience === 'admin' ? 'Để quản lý tài khoản thật, sử dụng mục Tài khoản & phân quyền.' : 'Không có quyền đổi vai trò hay phân công nhân sự.'}</p>
        <h2 className="text-xl font-semibold text-gray-900">Học viên chờ duyệt · {approved ? 0 : 1}</h2>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-light p-4">
          <div><p className="font-medium text-gray-900">Học viên chờ duyệt</p><p className="text-sm text-gray-600">pending@mock.local</p></div>
          <Button disabled={approved} onClick={() => setApproved(true)}>{approved ? 'Đã duyệt mô phỏng' : 'Duyệt học viên (mô phỏng)'}</Button>
        </div>
        <p role="status" className="text-sm text-gray-600">{approved ? 'Đã mô phỏng duyệt thành công. Tài khoản mock gốc không thay đổi.' : 'Học viên không cần được xếp lớp trước khi duyệt.'}</p>
      </Card>}
    </>}
  </div>;
}