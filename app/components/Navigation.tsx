"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "./NotificationBell";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { UserProfile } from "../../types/profile";
import { RiDashboardLine, RiProfileLine, RiTeamLine, RiLogoutBoxRLine, RiFileList2Line } from "react-icons/ri";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const Navigation = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userData, setUserData] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          console.log('Fetching user data for:', session.user.email);
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', session.user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data() as UserProfile;
            console.log('User data fetched:', {
              email: session.user.email,
              role: data.role,
              name: data.name
            });
            setUserData(data);
            
            // Update session role if it doesn't match
            if (session.user.role !== data.role) {
              console.log('Session role mismatch:', {
                sessionRole: session.user.role,
                dbRole: data.role
              });
            }
          } else {
            console.warn('No user document found for email:', session.user.email);
          }
        } catch (error) {
          console.error('Error fetching user data:', {
            error,
            email: session.user.email,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    fetchUserData();
  }, [session?.user?.email, session?.user?.role]);

  const adminNavItems: NavItem[] = [
    { href: "/dashboard/admin", label: "Dashboard", icon: <RiDashboardLine className="w-5 h-5" /> },       
    { href: "/dashboard/exam-tracking", label: "Exam Tracking", icon: <RiFileList2Line className="w-5 h-5" /> },
    { href: "/dashboard/profile", label: "Profile", icon: <RiProfileLine className="w-5 h-5" /> },
  ];

  const teacherNavItems: NavItem[] = [     
    { href: "/dashboard/class", label: "Classes", icon: <RiTeamLine className="w-5 h-5" /> },
    { href: "/dashboard/exam-tracking", label: "Exam Tracking", icon: <RiFileList2Line className="w-5 h-5" /> },
    { href: "/dashboard/profile", label: "Profile", icon: <RiProfileLine className="w-5 h-5" /> },
  ];

  const studentNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <RiDashboardLine className="w-5 h-5" /> },
    { href: "/dashboard/exam-tracking", label: "Exam Tracking", icon: <RiFileList2Line className="w-5 h-5" /> },
    { href: "/dashboard/profile", label: "Profile", icon: <RiProfileLine className="w-5 h-5" /> },
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
    <nav className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 transition-all duration-300 hover:scale-110 hover:rotate-6">
              <Image
                src="/orange-logo.png"
                alt="PTE Intensive Logo"
                width={48}
                height={48}
                className="h-12 w-auto"
              />
            </Link>
            <div className="flex space-x-8 ml-12">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center space-x-2 px-4 py-2.5 text-base font-medium transition-all duration-300 rounded-xl group ${
                    pathname === item.href
                      ? "bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white shadow-md"
                      : "text-[#fd7f33] hover:bg-[#fedac2] hover:text-[#fc5d01]"
                  }`}
                >
                  <span className={`transition-transform duration-300 ${
                    pathname === item.href
                      ? "scale-110"
                      : "group-hover:scale-110"
                  }`}>
                    {item.icon}
                  </span>
                  <span className="relative">
                    {item.label}
                    {pathname === item.href && (
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white rounded-full" />
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {userData?.role === "teacher" && session?.user?.email && (
              <NotificationBell 
                userRole={userData.role} 
                key={`${session.user.email}-${userData.role}`} 
              />
            )}
            <div className="flex items-center space-x-4 bg-gradient-to-r from-[#fedac2]/30 to-white/30 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-white/20">
              {userData?.avatar ? (
                <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-[#fedac2] transition-all duration-300 hover:ring-[#fc5d01] hover:ring-[3px] transform hover:scale-110 shadow-md">
                  <Image
                    src={userData.avatar}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-11 h-11 bg-gradient-to-br from-[#fedac2] to-[#fdbc94] rounded-full flex items-center justify-center ring-2 ring-[#fdbc94] transition-all duration-300 hover:ring-[#fc5d01] hover:ring-[3px] transform hover:scale-110 shadow-md">
                  <span className="text-xl text-[#fc5d01] font-semibold">
                    {userData?.name?.charAt(0) || session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex flex-col min-w-[140px]">
                <span className="text-sm font-bold text-[#fc5d01]">
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
              className="inline-flex items-center space-x-2 px-5 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] hover:from-[#fd7f33] hover:to-[#fc5d01] transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fedac2] shadow-md hover:shadow-lg group"
            >
              <span>Đăng xuất</span>
              <RiLogoutBoxRLine className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
