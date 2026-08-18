import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { AuthGuard } from '@/components/AuthGuard';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BookClub',
  description: 'A cozy home for your book club.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-dvh flex flex-col items-center">
          <AuthProvider>
            <ProfileProvider>
              <AuthGuard>
                <AppHeader />
                <main className="w-full max-w-md flex-1 px-4 py-4 pb-20 md:max-w-2xl md:px-6 md:py-6 md:pb-24 lg:max-w-3xl">
                  {children}
                </main>
                <BottomNav />
              </AuthGuard>
            </ProfileProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
