import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail, createUser } from "../../firebase/services/user";

export const authOptions: AuthOptions = {
  debug: true, // Enable debug logs
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account", // Force account selection
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
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
        console.error('No email provided in sign in attempt');
        return false;
      }

      try {

        // Check if user exists
        const existingUser = await getUserByEmail(user.email);

        if (existingUser) {
          user.id = existingUser.id;
          user.role = existingUser.role;
          return true;
        }


        // Create new user
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
          return '/login?error=DatabaseError';
        }

        user.id = userId;
        user.role = 'student';
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
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
      try {
        if (account && user) {
          
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.id = user.id;
          token.role = user.role;
        }
        return token;
      } catch (error) {
        console.error('Error in jwt callback:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token) {
          session.user.id = token.id as string;
          session.user.role = token.role as "admin" | "teacher" | "student" | "assistant";
          session.accessToken = token.accessToken;
          session.refreshToken = token.refreshToken;
        }
        return session;
      } catch (error) {
        console.error('Error in session callback:', error);
        return session;
      }
    },
  },
};
