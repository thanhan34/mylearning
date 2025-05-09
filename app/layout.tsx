import './globals.css';
import { Inter } from 'next/font/google';
import ClientProviders from './providers/ClientProviders';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/config';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'My Learning',
  description: 'Learning Management System',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ClientProviders session={session}>
          {children}
        </ClientProviders>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                if (typeof Chart !== 'undefined') {
                  console.log('Chart.js is loaded');
                } else {
                  console.error('Chart.js is not loaded');
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
