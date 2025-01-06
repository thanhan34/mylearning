"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  session: any;
}>;

export default function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session} refetchInterval={0}>
      {children}
    </NextAuthSessionProvider>
  );
}
