import Image from "next/image";
import logo from '../../../public/orange-logo.png'
import SplineBackground from "../../components/SplineBackground";
import LoginButton from "../../components/LoginButton";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      <SplineBackground />
      <div className="w-full max-w-md px-6 relative z-10 -mt-20">
        <div className="text-center mb-96">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <Image
              src={logo}
              alt="PTE Intensive Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-5xl font-bold text-[#fc5d01] mb-4">MY LEARNING</h1>
          <p className="text-xl text-white/90">Hệ thống quản lý bài tập về nhà PTE Intensive</p>
        </div>

        <div className="bg-black/30 backdrop-blur-md p-10 rounded-3xl shadow-lg border border-white/10 mt-40">
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
