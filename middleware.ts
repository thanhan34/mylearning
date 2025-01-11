import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role-based route protection
    if (path.startsWith("/dashboard/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/class") && 
        !["admin", "teacher"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Allow students to access submit page
    if (path.startsWith("/dashboard/submit")) {
      if (!token?.role) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (!["admin", "teacher", "student"].includes(token.role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Teacher route protection
    if (path.startsWith("/dashboard/teacher") && 
        !["admin", "teacher"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Only protect dashboard routes and related paths
export const config = {
  matcher: [
    '/dashboard/:path*'
  ]
};
