import type { Metadata } from 'next';
import { Geist_Mono, Poppins } from 'next/font/google';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { workforcePwaMetadata } from '@/lib/pwa/workforce-metadata';
import './globals.css';

/** Brand font from continentalcargo.com.au (Wix theme: poppins-v2). */
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Continental Cargo Workspace',
  description: 'Continental Cargo workforce operations platform',
  applicationName: 'Continental Cargo Workspace',
  ...workforcePwaMetadata,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-base text-foreground font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
