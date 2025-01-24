import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Mock Test - Admin - PTE Intensive",
  description: "Trang quản lý tổng thể Mock Test của học viên. Theo dõi tiến độ học tập, quản lý giáo viên chấm bài và xem thống kê tổng quan.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function AdminMocktestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
