import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserRole, createUser, getUserByEmail } from "../../../firebase/services";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";

export const authOptions: AuthOptions = {
  debug: false,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
      // Don't force account selection every time
      prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) {
        console.error('No email provided');
        return false;
      }

      try {
        console.log('Attempting sign in for:', user.email);
        
        // Check if user exists
        const existingUser = await getUserByEmail(user.email);
        console.log('Existing user check:', {
          email: user.email,
          found: !!existingUser,
          role: existingUser?.role
        });

        if (existingUser) {
          user.id = existingUser.id;
          user.role = existingUser.role;
          console.log('User found:', {
            id: user.id,
            role: user.role,
            email: user.email
          });
          return true;
        }

        // Create new user
        console.log('Creating new user:', {
          email: user.email,
          name: user.name || 'User'
        });

        const userId = await createUser({
          email: user.email,
          name: user.name || 'User',
          role: 'student'
        });

        if (!userId) {
          console.error('Failed to create user:', {
            email: user.email,
            name: user.name,
            timestamp: new Date().toISOString()
          });
          return false;
        }

        user.id = userId;
        user.role = 'student';
        console.log('New user created:', {
          id: userId,
          role: 'student',
          email: user.email
        });
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        // Log the full error details
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            email: user.email,
            timestamp: new Date().toISOString()
          });
        }
        return '/login?error=AccessDenied';
      }
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "teacher" | "student";
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
