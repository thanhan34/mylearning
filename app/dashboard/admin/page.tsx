import { Metadata } from "next";
import AdminDashboard from "../components/AdminDashboard";

export const metadata: Metadata = {
  title: "Dashboard Quản Trị Viên - PTE Intensive",
  description: "Quản lý hệ thống, theo dõi hoạt động của giảng viên và học viên, phân quyền người dùng.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function AdminPage() {
  return <AdminDashboard />;
}
