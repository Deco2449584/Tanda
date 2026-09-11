import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface InspectScreenHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function InspectScreenHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  actions,
}: InspectScreenHeaderProps) {
  return (
    <header className="flex items-start gap-3 px-4 pb-4 pt-5">
      {backHref ? (
        <Link
          href={backHref}
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-normal tracking-wide text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
