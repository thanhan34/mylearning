import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import SessionProvider from "./providers/SessionProvider";
import ClientProviders from "./providers/ClientProviders";
import "./globals.css";
import { authOptions } from "./api/auth/[...nextauth]/route";
const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      
      <body className={inter.className}>
        <SessionProvider session={session}>
          <ClientProviders>
            <main className="min-h-screen">{children}</main>
          </ClientProviders>
        </SessionProvider>
      </body>
    </html>
  );
}
