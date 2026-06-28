import type { Metadata } from 'next';
import { Geist_Mono, Libre_Baskerville, Poppins } from 'next/font/google';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { workforcePwaMetadata } from '@/lib/pwa/workforce-metadata';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

/** Web approximation of Tex Gyre Termes (brand serif) */
const texGyre = Libre_Baskerville({
  variable: '--font-tex-gyre',
  subsets: ['latin'],
  weight: ['400', '700'],
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
    <html
      lang="en"
      className={`${poppins.variable} ${texGyre.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-base text-foreground">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
