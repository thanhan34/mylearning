'use client';

import { SessionProvider } from 'next-auth/react';
import ChartProvider from './ChartProvider';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ChartProvider>
        {children}
      </ChartProvider>
    </SessionProvider>
  );
}
