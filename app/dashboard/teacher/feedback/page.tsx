import { Metadata } from "next";
import TeacherFeedbackClient from "./components/TeacherFeedbackClient";

export const metadata: Metadata = {
  title: "Quản lý Feedback - PTE Intensive",
  description: "Xem và cung cấp feedback cho bài tập của học viên.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function TeacherFeedbackPage() {
  return <TeacherFeedbackClient />;
}
