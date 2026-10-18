'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Tabs } from '@/components/ui';
import { EXERCISE_TYPES, LearningAccount } from '@/lib/learning-access';
import { learningApi } from '@/lib/learning-api';
import { RiTeamLine, RiTimeLine, RiShieldUserLine, RiRefreshLine, RiSearchLine } from 'react-icons/ri';

export default function AccountManagement({ approvalOnly = false }: { approvalOnly?: boolean } = {}) {
  const [accounts, setAccounts] = useState<LearningAccount[]>([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const saving = useRef(false);
  const load = useCallback(async () => {
    if (saving.current) return false;
    const current = ++version.current;
    setLoading(true); setError('');
    try {
      const result = await learningApi<{ accounts: LearningAccount[] }>('accounts');
      if (version.current !== current) return false;
      setAccounts(result.accounts); return true;
    }
    catch (err) { if (version.current === current) setError((err as Error).message); return false; }
    finally { if (version.current === current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);
  async function change(id: string, action: string, extra = {}) {
    if (saving.current) return;
    saving.current = true;
    // Ignore an older list request, without allowing it to overwrite the committed record.
    const current = ++version.current;
    setLoading(false);
    setBusy(id); setMessage('');
    try {
      const result = await learningApi<{ success: boolean; account: LearningAccount }>('accounts', { method: 'PATCH', body: JSON.stringify({ id, action, ...extra }) });
      if (version.current !== current) return;
      setAccounts(items => items.map(item => item.id === result.account.id ? result.account : item));
      setMessage('Đã lưu thay đổi.');
    } catch (err) { if (version.current === current) setMessage((err as Error).message); }
    finally { saving.current = false; if (version.current === current) setBusy(''); }
  }
  const visible = accounts.filter(account => {
    const matches = `${account.name} ${account.email}`.toLowerCase().includes(search.toLowerCase());
    return matches && (tab === 'pending' ? account.role === 'student' && account.approvalStatus !== 'approved'
      : tab === 'students' ? account.role === 'student' : !approvalOnly && ['teacher', 'assistant', 'admin_support'].includes(account.role));
  });
  const pending = accounts.filter(a => a.role === 'student' && a.approvalStatus !== 'approved').length;
  const stats = [
    { label: 'Học viên chờ duyệt', value: pending, icon: RiTimeLine },
    { label: 'Tài khoản học viên', value: accounts.filter(a => a.role === 'student').length, icon: RiTeamLine },
    ...(!approvalOnly ? [{ label: 'Nhân sự', value: accounts.filter(a => ['teacher', 'assistant', 'admin_support'].includes(a.role)).length, icon: RiShieldUserLine }] : []),
  ];
  return <div className="account-management space-y-6">
    <div className="account-introduction"><h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{approvalOnly ? 'Duyệt học viên' : 'Tài khoản & phân quyền'}</h2><p className="mt-2 text-sm leading-relaxed text-gray-600">{approvalOnly ? 'Duyệt học viên không cần xếp lớp. Không có quyền đổi vai trò hay phân công nhân sự.' : 'Duyệt học viên không cần xếp lớp. Quản lý giáo viên, trợ giảng và hỗ trợ admin; phân công dạng bài cho giáo viên/trợ giảng.'}</p></div>
    <div><div aria-label="Thống kê tài khoản đã tải" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{stats.map(stat => <Card key={stat.label} className="admin-surface account-stat flex items-center gap-3"><span className="admin-dashboard-icon"><stat.icon aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><p className="text-sm font-medium leading-relaxed text-gray-600">{stat.label}</p><p className="account-stat-value mt-1 text-3xl font-bold tabular-nums text-gray-900">{loading || error ? '—' : stat.value}</p></div></Card>)}</div><p className="mt-3 text-xs text-gray-500">Thống kê từ danh sách tài khoản đã tải, trước khi tìm kiếm.</p></div>
    <Card className="admin-surface account-filters space-y-4">
    <Tabs label="Quản lý tài khoản" value={tab} onChange={setTab} items={[
      { value: 'pending', label: `Chờ duyệt (${loading || error ? '—' : pending})` },
      { value: 'students', label: 'Học viên' }, ...(!approvalOnly ? [{ value: 'staff', label: 'Nhân sự' }] : []),
    ]} />
    <div className="account-search flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-sm font-medium text-gray-700">Tìm tài khoản<span className="relative mt-2 block"><RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input type="search" className="block w-full pl-10" placeholder="Tìm theo tên hoặc email" value={search} onChange={e => setSearch(e.target.value)} /></span></label><Button variant="secondary" disabled={!!busy || loading} onClick={load} className="inline-flex items-center justify-center gap-2 text-sm"><RiRefreshLine aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} /> Tải lại danh sách</Button></div>
    </Card>
    {message && <p role="status" className="rounded-xl border border-primary-light bg-primary-light/20 p-4 text-sm text-gray-700">{message}</p>}
    <p role="status" className="text-sm text-gray-500">{loading ? 'Đang tải tài khoản...' : error ? 'Chưa thể cập nhật danh sách' : `${visible.length} tài khoản phù hợp`}</p>
    {loading ? <div aria-hidden="true" className="space-y-4">{[0, 1].map(key => <Card key={key} className="admin-surface space-y-4 motion-safe:animate-pulse"><div className="h-5 w-1/3 rounded bg-gray-100" /><div className="h-16 rounded-xl bg-gray-50" /></Card>)}</div> : error ? <Card className="admin-surface"><h3 className="font-semibold text-gray-900">Không thể tải tài khoản</h3><p role="alert" className="mt-2 break-words text-sm text-gray-600">{error}</p><Button variant="secondary" disabled={!!busy} onClick={load} className="mt-4">Thử lại</Button></Card> : visible.length === 0 ? <Card className="admin-surface flex flex-col items-center py-8 text-center"><span className="admin-dashboard-icon mb-4"><RiSearchLine aria-hidden="true" className="h-6 w-6" /></span><h3 className="font-semibold text-gray-900">Không có tài khoản phù hợp.</h3><p className="mt-2 text-sm text-gray-600">{search ? 'Thử đổi từ khóa hoặc xóa tìm kiếm.' : 'Chọn nhóm tài khoản khác để tiếp tục quản lý.'}</p>{search && <Button variant="secondary" onClick={() => setSearch('')} className="mt-4">Xóa tìm kiếm</Button>}</Card> : visible.map(account => <Card key={account.id} className="admin-surface account-record space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3"><span aria-hidden="true" className="admin-dashboard-icon account-avatar text-sm font-bold">{(account.name || account.email).trim().split(/\s+/).map(part => part.charAt(0)).slice(0, 2).join('').toUpperCase()}</span><div className="min-w-0"><h3 className="break-words font-semibold text-gray-900">{account.name || account.email}</h3><p className="mt-1 break-all text-sm text-gray-600">{account.email}</p></div></div>
        <span className={`account-status ${account.role === 'student' ? account.approvalStatus === 'approved' ? 'account-status-approved' : 'account-status-pending' : 'account-status-staff'}`}>{account.role === 'student' ? account.approvalStatus === 'approved' ? 'Đã duyệt' : 'Chờ duyệt' : account.role === 'teacher' ? 'Giáo viên' : account.role === 'admin_support' ? 'Hỗ trợ admin' : 'Trợ giảng'}</span>
      </div>
      <div aria-busy={busy === account.id} className="account-actions flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        {account.role === 'student' && account.approvalStatus !== 'approved' && <Button disabled={!!busy} onClick={() => change(account.id, 'approve')}>{busy === account.id ? 'Đang lưu...' : 'Duyệt học viên'}</Button>}
        {!approvalOnly && <label className="account-role flex min-w-0 items-center gap-3 text-sm text-gray-700">Vai trò
          <select className="ui-input min-w-0 max-w-full flex-1" value={account.role} disabled={!!busy} onChange={e => {
            if (window.confirm('Đổi vai trò sẽ xóa phân công dạng bài; nếu chuyển về học viên cần duyệt lại. Tiếp tục?')) void change(account.id, 'role', { role: e.target.value });
          }}><option value="student">Học viên</option><option value="teacher">Giáo viên</option><option value="assistant">Trợ giảng</option><option value="admin_support">Hỗ trợ admin</option></select>
        </label>}
      </div>
      {!approvalOnly && ['teacher', 'assistant'].includes(account.role) && <TypeAssignment key={`${account.id}:${(account.assignedFeedbackTypes || []).join(',')}`} account={account} disabled={!!busy} onSave={types => change(account.id, 'assign-types', { types })} />}
    </Card>)}
  </div>;
}

function TypeAssignment({ account, disabled, onSave }: { account: LearningAccount; disabled: boolean; onSave: (types: string[]) => void }) {
  const [types, setTypes] = useState(account.assignedFeedbackTypes || []);
  return <fieldset disabled={disabled} className="min-w-0 space-y-4 border-t border-gray-100 pt-4">
    <legend className="font-medium text-gray-800">Dạng bài được phép feedback</legend>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{EXERCISE_TYPES.map(type => <label key={type} className={`admin-type-option ${types.includes(type) ? 'admin-type-option-selected' : ''}`}>
      <input type="checkbox" className="h-5 w-5 accent-primary focus-visible:ring-2 focus-visible:ring-primary" checked={types.includes(type)} onChange={e => setTypes(current => e.target.checked ? [...current, type] : current.filter(item => item !== type))} />{type}
    </label>)}</div>
    <p className="text-sm text-gray-600">Không chọn dạng bài nào = không có quyền feedback. Một dạng bài có thể giao cho nhiều người.</p>
    <Button disabled={disabled} onClick={() => onSave(types)}>Lưu phân công</Button>
  </fieldset>;
}