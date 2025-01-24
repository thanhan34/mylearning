import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Mock Test - Giáo viên - PTE Intensive",
  description: "Trang quản lý và chấm điểm Mock Test của học viên. Xem danh sách bài nộp, gửi nhận xét và theo dõi tiến độ học tập của học viên.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function TeacherMocktestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
