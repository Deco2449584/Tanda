import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderStat {
  label: string;
  value: string | number;
  accent?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Short uppercase eyebrow label (e.g. "Scheduling"). */
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  actions?: ReactNode;
  stats?: PageHeaderStat[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  actions,
  stats,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-surface-raised to-surface-raised p-5 md:p-6',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            {eyebrow ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {EyebrowIcon ? (
                  <EyebrowIcon className="h-3.5 w-3.5" aria-hidden />
                ) : null}
                {eyebrow}
              </div>
            ) : null}
            <h1
              className={cn(
                'font-display font-normal tracking-wide text-foreground',
                eyebrow
                  ? 'mt-3 text-2xl md:text-3xl'
                  : 'text-xl md:text-2xl',
              )}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
              {actions}
            </div>
          ) : null}
        </div>

        {stats && stats.length > 0 ? (
          <div
            className={cn(
              'grid gap-2',
              stats.length === 1 && 'grid-cols-1 sm:max-w-xs',
              stats.length === 2 && 'grid-cols-2 sm:max-w-md',
              stats.length === 3 && 'grid-cols-3',
              stats.length >= 4 && 'grid-cols-2 sm:grid-cols-4',
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'rounded-xl border px-3 py-2.5',
                  stat.accent
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border/70 bg-surface-base/50',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    'mt-1 text-xl font-semibold tabular-nums',
                    stat.accent ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title ? (
            <h2 className="font-display text-sm font-normal text-foreground">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-xs text-muted">{description}</p>
          ) : null}
        </div>
      )}
      {children}
    </section>
  );
}
