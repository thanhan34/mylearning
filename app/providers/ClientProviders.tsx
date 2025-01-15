'use client';

import CloudinaryConfig from './CloudinaryConfig';
import ErrorBoundary from '../components/ErrorBoundary';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <CloudinaryConfig />
      {children}
    </ErrorBoundary>
  );
}
