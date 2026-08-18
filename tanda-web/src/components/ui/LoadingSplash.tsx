'use client';

import { cn } from '@/lib/cn';

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-4 border-white/10 border-t-primary animate-spin',
        className,
      )}
      aria-hidden="true"
    />
  );
}

interface LoadingSplashProps {
  message?: string;
  className?: string;
  /** Full viewport height (session gates, login). */
  fullScreen?: boolean;
}

export function LoadingSplash({
  message,
  className,
  fullScreen = true,
}: LoadingSplashProps) {
  return (
    <div
      className={cn(
        'app-ambient flex flex-col items-center justify-center gap-4 bg-surface-base',
        fullScreen ? 'h-screen min-h-dvh w-full' : 'w-full py-12',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="h-14 w-14 md:h-16 md:w-16" />
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

/** Inline loading block for tables, cards and sections. */
export function LoadingIndicator({
  message = 'Loading…',
  className,
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="h-10 w-10" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
