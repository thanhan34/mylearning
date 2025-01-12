"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { UserProfile } from "../../types/profile";

interface NavItem {
  href: string;
  label: string;
}

const Navigation = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userData, setUserData] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', session.user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserData(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [session?.user?.email]);

  const adminNavItems: NavItem[] = [
    { href: "/dashboard/admin", label: "Dashboard" },       
    { href: "/dashboard/profile", label: "Profile" },
  ];

  const teacherNavItems: NavItem[] = [     
    { href: "/dashboard/class", label: "Classes" },
    { href: "/dashboard/profile", label: "Profile" },
  ];

  const studentNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
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
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/orange-logo.png"
                alt="PTE Intensive Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex space-x-8 ml-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? "border-[#fc5d01] text-[#fc5d01]"
                      : "border-transparent text-[#fd7f33] hover:text-[#fc5d01] hover:border-[#fedac2]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {userData?.avatar ? (
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#fedac2]">
                  <Image
                    src={userData.avatar}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-[#fedac2] rounded-full flex items-center justify-center ring-2 ring-[#fdbc94]">
                  <span className="text-lg text-[#fc5d01] font-semibold">
                    {userData?.name?.charAt(0) || session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex flex-col min-w-[120px]">
                <span className="text-sm font-semibold text-[#fc5d01]">
                  {userData?.name || session?.user?.name || 'User'}
                </span>
                <span className="text-xs text-[#fd7f33]">
                  {session?.user?.email}
                </span>
                <span className="text-xs text-[#fc5d01] capitalize font-medium">
                  {session?.user?.role || 'User'}
                </span>
              </div>
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
