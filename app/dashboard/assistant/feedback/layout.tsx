import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Feedback - PTE Intensive",
  description: "Xem và cung cấp feedback cho bài tập của học viên.",
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
