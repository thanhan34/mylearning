"use client";

import { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  session: Session | null;
}>;

export default function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider 
      session={session} 
      refetchInterval={0} // Disable auto-refresh
      refetchOnWindowFocus={false} // Disable refresh on window focus
    >
      {children}
    </NextAuthSessionProvider>
  );
}
