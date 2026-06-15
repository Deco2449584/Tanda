import type { Metadata } from 'next';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

export const metadata: Metadata = {
  title: 'Suite 04 — Portal de clientes | Continental Cargo',
  description: 'Consulte el estado de su carga con AWB y PIN de empresa.',
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <CompanyLogo className="h-8 w-auto" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Suite 04
              </p>
              <p className="text-sm font-medium text-zinc-600">Portal de clientes</p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
