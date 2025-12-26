import { Metadata } from "next";
import AssistantFeedbackClient from "./components/AssistantFeedbackClient";

export const metadata: Metadata = {
  title: "Quản lý Feedback - PTE Intensive",
  description: "Xem và cung cấp feedback cho bài tập của học viên.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function AssistantFeedbackPage() {
  return <AssistantFeedbackClient />;
}
