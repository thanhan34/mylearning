"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-[#fc5d01] text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-[#fc5d01]">
                Welcome to your Dashboard
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-[#fd7f33]">
                You are signed in as {session?.user?.email}
              </p>
            </div>
            <div className="border-t border-[#fedac2]">
              <dl>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-[#fd7f33]">Role</dt>
                  <dd className="mt-1 text-sm text-[#fc5d01] sm:mt-0 sm:col-span-2">
                    {(session?.user as any)?.role || "Student"}
                  </dd>
                </div>
                <div className="bg-[#fedac2] bg-opacity-10 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-[#fd7f33]">Email</dt>
                  <dd className="mt-1 text-sm text-[#fc5d01] sm:mt-0 sm:col-span-2">
                    {session?.user?.email}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-[#fd7f33]">Name</dt>
                  <dd className="mt-1 text-sm text-[#fc5d01] sm:mt-0 sm:col-span-2">
                    {session?.user?.name}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
