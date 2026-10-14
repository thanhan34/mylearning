'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Tabs } from '@/components/ui';
import AttendanceStatsTable from '@/components/AttendanceStatsTable';
import AttendanceDaySummary from '@/components/AttendanceDaySummary';
import { useLearningAccount } from '@/components/LearningGate';
import { cachedRequest } from '@/lib/client-cache';
import { learningApi } from '@/lib/learning-api';
import { auditWindow, vietnamDate } from '@/lib/attendance-audit';
import { loadAttendanceRange, mergeAttendanceRows, mergeAttendanceDailyRows, completeAttendanceDailyRows } from '@/lib/attendance-range-loader';
import type { AuditStaff, AuditRangePage, AuditRangeRow, AuditDailyRow } from '@/lib/attendance-audit';

export default function AttendanceRangeStats({ staff }: { staff: AuditStaff }) {
  const actor = useLearningAccount();
  const today = vietnamDate();
  const [start, setStart] = useState(() => auditWindow(today).start);
  const [end, setEnd] = useState(today);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [rows, setRows] = useState<AuditRangeRow[]>([]);
  const [dailyRows, setDailyRows] = useState<AuditDailyRow[]>([]);
  const [view, setView] = useState('daily');
  const [scanned, setScanned] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const request = useRef(0);
  const inFlight = useRef(false);
  const stop = useRef(false);
  useEffect(() => () => { request.current++; stop.current = true; }, []);

  async function load(reset: boolean) {
    if (!actor || !['admin', 'admin_support'].includes(actor.role) || inFlight.current) return;
    const selected = reset ? { start, end } : range;
    if (!selected) return;
    if (!selected.start || !selected.end || selected.start > selected.end || selected.end > today || Date.parse(selected.end) - Date.parse(selected.start) > 30 * 86400000) {
      setError('Chọn khoảng ngày hợp lệ, tối đa 31 ngày và không vượt hôm nay.'); return;
    }
    inFlight.current = true;
    stop.current = false;
    const version = ++request.current;
    setBusy(true); setError('');
    if (reset) { setRange(selected); setRows([]); setDailyRows([]); setScanned(0); setCursor(null); setLoaded(false); }
    let accumulated = reset ? [] : rows;
    let accumulatedDaily = reset ? [] : dailyRows;
    let count = reset ? 0 : scanned;
    try {
      await loadAttendanceRange({
        after: reset ? null : cursor,
        shouldStop: () => stop.current || version !== request.current,
        fetchPage: after => {
          const params = new URLSearchParams({ mode: 'range', staffId: staff.id, ...selected });
          if (after) params.set('after', after);
          const path = `attendance?${params}`;
          return cachedRequest<AuditRangePage>(`attendance:${actor.id}:${actor.role}:daily-v1:${path}`, 60000, () => learningApi(path));
        },
        onPage: result => {
          if (version !== request.current) return;
          accumulated = mergeAttendanceRows(accumulated, result.rows);
          accumulatedDaily = mergeAttendanceDailyRows(accumulatedDaily, result.dailyRows);
          count += result.scanned;
          setRows(accumulated); setDailyRows(accumulatedDaily); setScanned(count);
          setCursor(result.nextCursor); setLoaded(true); setFetchedAt(result.fetchedAt);
        },
      });
    } catch (err) { if (version === request.current) setError(err instanceof Error ? err.message : 'Không thể tải thống kê.'); }
    finally { if (version === request.current) { setBusy(false); inFlight.current = false; } }
  }
  const completeDailyRows = range ? completeAttendanceDailyRows(dailyRows, rows.map(row => row.type), range.start, range.end) : [];
  return <Card className="space-y-4">
    <h3 className="text-xl font-semibold text-gray-900">Thống kê theo ngày và dạng bài · {staff.name}</h3>
    <p className="text-sm text-gray-600">Lọc theo ngày học viên nộp bài, bao gồm cả ngày bắt đầu và kết thúc. Chỉ thống kê các dạng bài được phân công hiện tại; “Đã feedback” chỉ đếm bài do chính nhân sự này feedback, kể cả trễ hạn.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void load(true); }}>
      <label className="text-sm text-gray-700">Từ ngày<Input type="date" required max={today} value={start} onChange={event => setStart(event.target.value)} className="mt-2 block" /></label>
      <label className="text-sm text-gray-700">Đến ngày<Input type="date" required min={start} max={today} value={end} onChange={event => setEnd(event.target.value)} className="mt-2 block" /></label>
      <Button type="submit" disabled={busy}>Xem thống kê</Button>
    </form>
    <p className="text-sm text-gray-600">Tối đa 31 ngày/lần. Tự tải tuần tự từng trang 5 hồ sơ, dùng cache 60 giây. Tạm dừng sau tối đa 500 hồ sơ mỗi lượt để kiểm soát lượt đọc; có thể tiếp tục từ vị trí đã dừng.</p>
    {error && <p role="alert">{error}</p>}
    {busy && <><p role="status">Đang tổng hợp toàn khoảng · {scanned} hồ sơ đã đọc. Chưa hiển thị tổng cho đến khi tải hết.</p><Button onClick={() => { stop.current = true; }}>Dừng sau trang hiện tại</Button></>}
    {loaded && <>
      <p role="status" className="font-semibold text-gray-900">{range?.start} – {range?.end} · {cursor ? 'CHƯA ĐẦY ĐỦ — số liệu cộng dồn phần đã tải' : 'Đã đọc hết khoảng ngày đã chọn'} · {scanned} hồ sơ đã đọc.</p>
      {!cursor && !busy && !error && rows.length > 0 && range && <>
        <AttendanceDaySummary rows={completeDailyRows} />
        <Tabs label="Chế độ thống kê feedback" value={view} onChange={setView} items={[{ value: 'daily', label: 'Chi tiết từng ngày' }, { value: 'summary', label: 'Tổng hợp dạng bài' }]} />
        <AttendanceStatsTable staffName={staff.name} daily={view === 'daily'} rows={view === 'daily' ? completeDailyRows : rows} />
        <p className="text-sm text-gray-600">Ngày không có bài hiển thị 0 và tỷ lệ “—”, không tự phát sinh ngày công. Vuốt ngang bảng để xem đầy đủ các cột trên điện thoại.</p>
      </>}
      {!cursor && !busy && !rows.length && <p>Nhân sự chưa được phân công dạng bài.</p>}
      {cursor && !busy && <><p>Thống kê chưa hoàn tất. Chưa hiển thị bảng tổng để tránh nhầm số liệu một phần với toàn khoảng.</p><Button onClick={() => void load(false)}>Tiếp tục để hoàn tất thống kê</Button></>}
      <p className="text-sm text-gray-600">Dữ liệu trang gần nhất: {new Date(fetchedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Các trang được đọc tại thời điểm khác nhau, không phải bản chốt bất biến.</p>
    </>}
    <p className="text-sm text-gray-600">% feedback thực hiện = số bài người này đã feedback / tổng bài cùng ngày, cùng dạng × 100% (bảng tổng hợp tính trên toàn khoảng). % trong hạn chỉ tính feedback trong hạn bù 3 ngày và không vượt ngày chốt công 20, theo giờ Việt Nam. Các tỷ lệ này không thay thế điều kiện 30% riêng cho từng học viên mỗi ngày và không xác nhận ngày công.</p>
  </Card>;
}