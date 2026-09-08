import Link from 'next/link';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { PORTAL_COMPANY_TAGLINE } from '@/lib/portal/portal-brand';

interface PortalHeaderProps {
  actions?: React.ReactNode;
}

export function PortalHeader({ actions }: PortalHeaderProps) {
  return (
    <header className="border-b border-white/10 bg-[#141414] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/portal" className="flex min-w-0 items-center gap-4">
          <CompanyLogo
            variant="mark-light"
            className="h-9 w-9 sm:h-10 sm:w-10"
            priority
          />
          <div className="hidden min-w-0 border-l border-white/20 pl-4 sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Client portal
            </p>
            <p className="truncate text-xs text-white/50">{PORTAL_COMPANY_TAGLINE}</p>
          </div>
        </Link>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
