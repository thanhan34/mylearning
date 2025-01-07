import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    console.log("Middleware checking path:", path);
    console.log("Token:", token);

    // Role-based route protection
    if (path.startsWith("/dashboard/admin") && token?.role !== "admin") {
      console.log("Unauthorized admin access attempt");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/dashboard/class") && 
        !["admin", "teacher"].includes(token?.role as string)) {
      console.log("Unauthorized class access attempt");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Allow students to access assignments page
    if (path.startsWith("/dashboard/assignments")) {
      console.log("Assignments page access attempt");
      if (!token?.role) {
        console.log("No role found in token");
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (!["admin", "teacher", "student"].includes(token.role)) {
        console.log("Invalid role for assignments:", token.role);
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - login page
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public|login).*)",
  ],
};
