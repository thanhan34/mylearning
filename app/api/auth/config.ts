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
        console.log('Sign in attempt:', {
          email: user.email,
          name: user.name,
          timestamp: new Date().toISOString()
        });

        // Check if user exists
        const existingUser = await getUserByEmail(user.email);

        if (existingUser) {
          console.log('Existing user found:', {
            id: existingUser.id,
            role: existingUser.role,
            email: existingUser.email
          });
          user.id = existingUser.id;
          user.role = existingUser.role;
          return true;
        }

        console.log('Creating new user:', {
          email: user.email,
          name: user.name
        });

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
          console.log('JWT callback - account:', {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            token_type: account.token_type,
            scope: account.scope
          });
          
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.id = user.id;
          token.role = user.role;
          console.log('JWT token created:', {
            id: user.id,
            role: user.role,
            email: user.email,
            hasAccessToken: !!token.accessToken,
            hasRefreshToken: !!token.refreshToken
          });
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
          console.log('Session created:', {
            id: session.user.id,
            role: session.user.role,
            email: session.user.email,
            hasAccessToken: !!session.accessToken,
            hasRefreshToken: !!session.refreshToken
          });
        }
        return session;
      } catch (error) {
        console.error('Error in session callback:', error);
        return session;
      }
    },
  },
};
