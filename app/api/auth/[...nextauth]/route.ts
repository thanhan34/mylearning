import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserRole, createUser } from "../../../firebase/services";

export const authOptions: AuthOptions = {
  debug: true, // Enable debug mode for troubleshooting
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
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
    async signIn({ user, account, profile }) {
      console.log('Full sign in data:', { user, account, profile });
      if (!user?.email) {
        console.error('No email provided for user');
        return false;
      }

      try {
        console.log('SignIn callback started for:', user.email);
        
        // Check if user exists in Firebase
        const role = await getUserRole(user.email);
        console.log('Existing user role:', role);
        
        if (!role) {
          console.log('Creating new user in Firebase');
          const userData: {
            email: string;
            name: string;
            role: "admin" | "teacher" | "student";
          } = {
            email: user.email,
            name: user.name || 'User',
            role: 'student'
          };
          console.log('User data to create:', userData);
          
          const userId = await createUser(userData);
          
          if (!userId) {
            console.error('Failed to create user in Firebase');
            return false;
          }
          
          console.log('Successfully created user with ID:', userId);
        }
        
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        // Log the full error details
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (account && user && user.email) {
        token.accessToken = account.access_token;
        // Get role from Firebase
        const role = await getUserRole(user.email);
        token.role = role || 'student';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "admin" | "teacher" | "student";
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
