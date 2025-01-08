'use client';

import CloudinaryConfig from './CloudinaryConfig';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CloudinaryConfig />
      {children}
    </>
  );
}
