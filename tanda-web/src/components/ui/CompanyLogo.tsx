'use client';

import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export type CompanyLogoVariant = 'default' | 'light' | 'mark' | 'mark-light';

const LOGO_ASSETS: Record<
  CompanyLogoVariant,
  { src: string; width: number; height: number }
> = {
  default: { src: '/logo.svg', width: 548, height: 480 },
  light: { src: '/logo-light.svg', width: 548, height: 480 },
  mark: { src: '/logo-mark.svg', width: 250, height: 250 },
  'mark-light': { src: '/logo-mark-light.svg', width: 250, height: 250 },
};

interface CompanyLogoProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  /** @deprecated Use variant="light" instead */
  invert?: boolean;
  variant?: CompanyLogoVariant;
}

export function CompanyLogo({
  alt,
  className = 'h-16 w-auto object-contain',
  priority = false,
  invert = false,
  variant,
}: CompanyLogoProps) {
  const label = alt ?? COMPANY_NAME;
  const resolvedVariant = variant ?? (invert ? 'light' : 'default');
  const asset = LOGO_ASSETS[resolvedVariant];

  return (
    <Image
      src={asset.src}
      alt={label}
      width={asset.width}
      height={asset.height}
      priority={priority}
      className={cn('object-contain object-center', className)}
    />
  );
}

export function CompanyLogoSidebar({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2.5 overflow-visible text-center', className)}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible">
        <CompanyLogo variant="mark-light" className="h-12 w-12 max-h-full max-w-full" priority />
      </div>
      <div className="min-w-0 px-1">
        <p className="text-[11px] font-extrabold leading-tight tracking-wide text-foreground">
          CONTINENTAL CARGO
        </p>
        <p className="mt-0.5 text-[9px] font-semibold tracking-[0.16em] text-subtle">
          LOGISTICS COMPANY
        </p>
      </div>
    </div>
  );
}

export function CompanyLogoPlaceholder({
  className = 'h-16 w-16',
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-500 ${className}`}
    >
      <Building2 className="h-1/2 w-1/2" strokeWidth={1.5} />
    </div>
  );
}
