import Link from 'next/link';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { PORTAL_COMPANY_TAGLINE } from '@/lib/portal/portal-brand';

interface PortalHeaderProps {
  actions?: React.ReactNode;
}

export function PortalHeader({ actions }: PortalHeaderProps) {
  return (
    <header className="border-b border-[#262626]/10 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/portal" className="flex min-w-0 items-center gap-4">
          <CompanyLogo className="h-9 w-auto sm:h-10" priority />
          <div className="hidden min-w-0 border-l border-[#262626]/15 pl-4 sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70">
              Client portal
            </p>
            <p className="truncate text-xs text-zinc-500">{PORTAL_COMPANY_TAGLINE}</p>
          </div>
        </Link>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
