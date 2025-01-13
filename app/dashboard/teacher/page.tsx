import { Metadata } from "next";
import TeacherStats from "./components/TeacherStats";

export const metadata: Metadata = {
  title: "Dashboard Giảng Viên - PTE Intensive",
  description: "Theo dõi tiến độ học tập của học viên, quản lý lớp học, và giao bài tập.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function TeacherDashboard() {
  return <TeacherStats />;
}
