import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('app-ambient mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8', className)}>
      {children}
    </div>
  );
}
