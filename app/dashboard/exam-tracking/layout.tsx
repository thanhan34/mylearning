import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Theo dõi tiến độ ôn tập PTE - PTE Intensive",
  description: "Trang theo dõi tiến độ ôn tập và hỗ trợ học viên chuẩn bị thi PTE. Điền thông tin cá nhân, ngày thi, nơi thi để nhận hỗ trợ từ giáo viên.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function ExamTrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
