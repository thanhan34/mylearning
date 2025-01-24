import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nộp bài Mock Test - PTE Intensive",
  description: "Nộp bài Mock Test PTE của bạn để giáo viên chấm điểm và gửi nhận xét chi tiết. Theo dõi tiến độ học tập và cải thiện kết quả thi PTE.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function MocktestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
