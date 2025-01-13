import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import LoginUI from "../../components/LoginUI";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Bài tập Về Nhà - PTE Intensive",
  description: "Hệ thống tự động giao bài tập và theo dõi tiến độ học tập của học viên. Quản lý dễ dàng, hiệu quả, tối ưu thời gian.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico"
  }
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return <LoginUI />;
}
