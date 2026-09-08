import { PortalFooter } from '@/components/portal/PortalFooter';
import { PortalHeader } from '@/components/portal/PortalHeader';

export default function PortalTrackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#1A1A1A]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 14% 12%, rgba(245,30,160,0.10), transparent 40%), radial-gradient(circle at 86% 0%, rgba(96,96,96,0.18), transparent 34%), linear-gradient(180deg, #222222 0%, #1A1A1A 55%, #141414 100%)',
        }}
        aria-hidden
      />
      <div className="relative flex min-h-screen flex-col">
        <PortalHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
        <PortalFooter />
      </div>
    </div>
  );
}
