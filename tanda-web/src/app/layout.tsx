import type { Metadata } from 'next';
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { workforcePwaMetadata } from '@/lib/pwa/workforce-metadata';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Continental Cargo | Workforce',
  description: 'Continental Cargo workforce operations platform',
  applicationName: 'Continental Cargo',
  ...workforcePwaMetadata,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface-base text-foreground">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
