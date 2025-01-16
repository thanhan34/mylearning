'use client';

import SessionProvider from './SessionProvider';
import ChartProvider from './ChartProvider';

export default function ClientProviders({
  children,
  session
}: {
  children: React.ReactNode;
  session: any;
}) {
  return (
    <SessionProvider session={session}>
      <ChartProvider>
        {children}
      </ChartProvider>
    </SessionProvider>
  );
}
