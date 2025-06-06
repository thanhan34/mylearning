import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
      role?: "admin" | "teacher" | "student" | "assistant";
    } & DefaultSession["user"];
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    id?: string;
    email: string;
    role?: "admin" | "teacher" | "student" | "assistant";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    role?: "admin" | "teacher" | "student" | "assistant";
    accessToken?: string;
    refreshToken?: string;
  }
}
