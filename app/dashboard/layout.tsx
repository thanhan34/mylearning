import { Metadata } from "next";
import DashboardLayoutClient from "./DashboardLayoutClient";

export const metadata: Metadata = {
  title: "Dashboard Học Viên - PTE Intensive",
  description: "Theo dõi tiến độ học tập hàng ngày, nộp bài tập, và nhận thông báo từ hệ thống.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
