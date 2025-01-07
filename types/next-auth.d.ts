import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
      role?: "admin" | "teacher" | "student";
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User {
    role?: "admin" | "teacher" | "student";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "teacher" | "student";
    accessToken?: string;
  }
}
