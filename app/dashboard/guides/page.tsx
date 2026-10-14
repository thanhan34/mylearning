import HomeworkGuide from '../components/HomeworkGuide';
import ApeUniAccountGuide from '../components/ApeUniAccountGuide';
import ZoomGuide from '../components/ZoomGuide';
import SubmissionGuide from '../components/SubmissionGuide';
import ApeUniCopyLinkGuide from '../components/ApeUniCopyLinkGuide';
import WfdGuide from '../components/WfdGuide';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { RiArrowRightLine, RiBookOpenLine, RiLightbulbLine, RiLinksLine, RiSendPlaneLine, RiUserAddLine, RiVideoLine, RiHeadphoneLine } from 'react-icons/ri';

const guides = [
  { id: 'zoom', title: 'Cài đặt Zoom', description: 'Chuẩn bị thiết bị, âm thanh và tên học viên.', steps: 6, component: ZoomGuide, icon: RiVideoLine, group: 'Chuẩn bị' },
  { id: 'account', title: 'Tạo tài khoản ApeUni', description: 'Đăng ký và xác nhận email trước khi luyện tập.', steps: 3, component: ApeUniAccountGuide, icon: RiUserAddLine, group: 'Chuẩn bị' },
  { id: 'homework', title: 'Làm bài tập về nhà', description: 'Chọn đúng dạng bài, Priority và thứ tự làm bài.', steps: 4, component: HomeworkGuide, icon: RiBookOpenLine, group: 'Luyện tập & nộp bài' },
  { id: 'copy-link', title: 'Copy link bài tập', description: 'Lấy đúng link kết quả của từng bài trên ApeUni.', steps: 6, component: ApeUniCopyLinkGuide, icon: RiLinksLine, group: 'Luyện tập & nộp bài' },
  { id: 'submission', title: 'Nộp bài trên My Learning', description: 'Dán link, kiểm tra và gửi bài cho giáo viên.', steps: 4, component: SubmissionGuide, icon: RiSendPlaneLine, group: 'Luyện tập & nộp bài' },
  { id: 'wfd', title: 'Học bộ tủ WFD', description: '2 Topic mỗi tuần, mỗi câu 5 lần và gửi bài vào nhóm học.', steps: 5, component: WfdGuide, icon: RiHeadphoneLine, group: 'Luyện tập bổ trợ' },
];
const groups = ['Chuẩn bị', 'Luyện tập & nộp bài', 'Luyện tập bổ trợ'];

export default function GuidesPage({ searchParams }: { searchParams?: { topic?: string | string[] } }) {
  const selectedIndex = Math.max(0, guides.findIndex(guide => guide.id === searchParams?.topic));
  const selected = guides[selectedIndex];
  const SelectedGuide = selected.component;
  const SelectedIcon = selected.icon;
  const previous = guides[selectedIndex - 1];
  const next = guides[selectedIndex + 1];
  const topicHref = (id: string) => `/dashboard/guides?topic=${id}#guide-content`;

  return (
    <div className="guides-page mx-auto max-w-7xl space-y-6 py-4 sm:py-8">
      <header className="guide-hero">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
              <RiBookOpenLine aria-hidden="true" className="h-4 w-4 text-primary" /> PTE Intensive · Góc học viên
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Hướng dẫn</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
              Bắt đầu đúng cách, học tập tự tin hơn. Tất cả hướng dẫn từ chuẩn bị lớp học đến nộp bài, tại một nơi.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="guide-badge">{guides.length} chủ đề thiết yếu</span>
              <span className="guide-badge">Hướng dẫn từng bước</span>
              <span className="guide-badge">Dành cho học viên</span>
            </div>
          </div>
          <Link href="/dashboard/submissions" className="ui-button inline-flex shrink-0 items-center justify-center gap-3 bg-primary text-white hover:bg-primary-vivid">
            Đi đến Nộp bài tập <RiArrowRightLine aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="guide-directory">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 id="guide-topics-title" className="font-semibold text-gray-900">Danh mục hướng dẫn</h2>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light/40 text-xs font-semibold text-gray-700">{String(guides.length).padStart(2, '0')}</span>
            </div>
            <nav aria-labelledby="guide-topics-title" className="space-y-6">
              {groups.map((group, groupIndex) => (
                <div key={group}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{groupIndex + 1}. {group}</h3>
                  <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {guides.filter(guide => guide.group === group).map(guide => {
                      const Icon = guide.icon;
                      return <li key={guide.id}>
                        <Link href={topicHref(guide.id)} aria-current={selected.id === guide.id ? 'page' : undefined}
                          className={`guide-topic ${selected.id === guide.id ? 'guide-topic-selected' : ''}`}>
                          <span aria-hidden="true" className="guide-topic-icon"><Icon className="h-5 w-5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-relaxed">{guide.title}</span>
                            <span className="mt-1 block text-xs text-gray-500">{guide.steps} bước{selected.id === guide.id ? ' · Đang xem' : ''}</span>
                          </span>
                          {selected.id === guide.id && <RiArrowRightLine aria-hidden="true" className="mt-2 h-4 w-4 shrink-0 text-primary" />}
                        </Link>
                      </li>;
                    })}
                  </ol>
                </div>
              ))}
            </nav>
          </Card>
          <div className="guide-tip flex items-start gap-3 rounded-xl p-4">
            <RiLightbulbLine aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><p className="text-sm font-semibold text-gray-900">Bạn mới bắt đầu?</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">Đọc lần lượt từ cài đặt Zoom đến nộp bài để sẵn sàng cho buổi học đầu tiên.</p>
            </div>
          </div>
        </aside>

        <div id="guide-content" tabIndex={-1} className="guide-reader min-w-0 scroll-mt-24 space-y-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <div className="guide-reader-summary">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary-light bg-white text-primary"><SelectedIcon aria-hidden="true" className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{selected.group}</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Chủ đề {selectedIndex + 1} / {guides.length} · {selected.steps} bước</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{selected.description}</p>
              </div>
            </div>
            <div aria-hidden="true" className="mt-4 flex gap-2">
              {guides.map(guide => <span key={guide.id} className={`h-1 flex-1 rounded-full ${guide.id === selected.id ? 'bg-primary' : 'bg-primary-light/60'}`} />)}
            </div>
          </div>
          <SelectedGuide />
          <nav aria-label="Chuyển hướng dẫn" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {previous ? <Link href={topicHref(previous.id)} className="ui-button guide-pagination border border-primary-light bg-white text-gray-700 hover:bg-primary-light/30">
              <span className="block text-xs font-normal">← Trước</span>
              <span className="block mt-1">{previous.title}</span>
            </Link> : <Link href="/dashboard" className="ui-button guide-pagination border border-primary-light bg-white text-gray-700 hover:bg-primary-light/30">← Về Dashboard</Link>}
            {next ? <Link href={topicHref(next.id)} className="ui-button guide-pagination bg-primary text-white hover:bg-primary-vivid">
              <span className="block text-xs font-normal">Tiếp theo →</span>
              <span className="block mt-1">{next.title}</span>
            </Link> : <Link href="/dashboard/submissions" className="ui-button guide-pagination bg-primary text-white hover:bg-primary-vivid">Đi đến Nộp bài tập →</Link>}
          </nav>
          <p className="px-4 text-center text-xs leading-relaxed text-gray-500">Cần hỗ trợ thêm? Gửi ảnh chụp màn hình và mô tả vấn đề cho giáo viên hoặc nhóm hỗ trợ lớp học.</p>
        </div>
      </div>
    </div>
  );
}