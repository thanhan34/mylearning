"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const Navigation = () => {
  const { data: session } = useSession();
  const pathname = usePathname();

  const adminNavItems: NavItem[] = [
    { href: "/dashboard/admin", label: "Dashboard" },
    { href: "/dashboard/class", label: "Classes" },   
    { href: "/dashboard/profile", label: "Profile" },
  ];

  const teacherNavItems: NavItem[] = [
    { href: "/dashboard/teacher", label: "Học viên" },
    { href: "/dashboard/teacher/assign", label: "Assign Học Viên" },
    { href: "/dashboard/class", label: "Classes" },
    { href: "/dashboard/profile", label: "Profile" },
  ];

  const studentNavItems: NavItem[] = [
    { href: "/dashboard/profile", label: "Profile" },
  ];

  const getNavItems = () => {
    const role = session?.user?.role;
    switch (role) {
      case "admin":
        return adminNavItems;
      case "teacher":
        return teacherNavItems;
      case "student":
        return studentNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === item.href
                    ? "border-[#fc5d01] text-[#fc5d01]"
                    : "border-transparent text-gray-500 hover:text-[#fd7f33] hover:border-[#fedac2]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-gray-900">
                {session?.user?.name || 'User'}
              </span>
              <span className="text-xs text-gray-500">
                {session?.user?.email}
              </span>
              <span className="text-xs text-[#fc5d01] capitalize">
                {session?.user?.role || 'User'}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#fc5d01] hover:bg-[#fd7f33] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fedac2]"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
