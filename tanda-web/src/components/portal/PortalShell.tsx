'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { clearPortalSession } from '@/lib/portal/client-session';
import { cn } from '@/lib/cn';

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const onList = pathname === '/portal/track';

  function signOut() {
    clearPortalSession();
    router.replace('/portal');
  }

  function close() {
    setOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-black lg:flex">
        <PortalNav
          onList={onList}
          onNavigate={close}
          onSignOut={signOut}
        />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={close}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-white/10 bg-black">
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/5 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <PortalNav
              onList={onList}
              onNavigate={close}
              onSignOut={signOut}
            />
          </aside>
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="relative z-10 flex min-h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white"
            aria-label="Open menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <CompanyLogo variant="mark-light" className="h-8 w-8 mix-blend-screen" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Client portal
          </p>
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
        <PortalFooter />
        </div>
      </div>
    </div>
  );
}

function PortalNav({
  onList,
  onNavigate,
  onSignOut,
}: {
  onList: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-4 py-6">
      <Link href="/portal/track" onClick={onNavigate} className="px-2">
        <CompanyLogo
          variant="horizontal"
          className="h-12 w-auto max-w-[180px] object-contain object-left mix-blend-screen"
        />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Client portal
        </p>
      </Link>

      <nav className="mt-8 flex flex-col gap-1" aria-label="Portal">
        <NavLink
          href="/portal/track"
          active={onList}
          icon={LayoutDashboard}
          label="Dashboard"
          onNavigate={onNavigate}
        />
        <NavLink
          href="/portal/track"
          active={!onList}
          icon={ClipboardList}
          label="Inspections"
          onNavigate={onNavigate}
        />
      </nav>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-auto inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: typeof LayoutDashboard;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
        active
          ? 'bg-[#F51EA0] text-white'
          : 'text-white/70 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
