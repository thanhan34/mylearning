import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
      role?: "admin" | "admin_support" | "teacher" | "student" | "assistant";
    } & DefaultSession["user"];
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    id?: string;
    email: string;
    role?: "admin" | "admin_support" | "teacher" | "student" | "assistant";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    role?: "admin" | "admin_support" | "teacher" | "student" | "assistant";
    accessToken?: string;
    refreshToken?: string;
  }
}
