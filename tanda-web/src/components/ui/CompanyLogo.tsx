'use client';

import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export type CompanyLogoVariant =
  | 'horizontal'
  | 'stacked'
  | 'mark'
  | 'mark-light'
  /** @deprecated Prefer `horizontal` on dark UI */
  | 'light'
  /** @deprecated Prefer `horizontal` or `mark` by background */
  | 'default';

const LOGO_ASSETS: Record<
  Exclude<CompanyLogoVariant, 'light' | 'default'>,
  { src: string; width: number; height: number }
> = {
  horizontal: { src: '/logos/logo-horizontal.png', width: 1585, height: 443 },
  stacked: { src: '/logos/logo-stacked.png', width: 1125, height: 646 },
  mark: { src: '/logos/logo-mark.png', width: 2378, height: 2392 },
  'mark-light': { src: '/logos/logo-mark-light.png', width: 2379, height: 2393 },
};

function resolveAsset(variant: CompanyLogoVariant) {
  if (variant === 'light' || variant === 'default') {
    return LOGO_ASSETS.horizontal;
  }
  return LOGO_ASSETS[variant];
}

interface CompanyLogoProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  /** @deprecated Use variant="light" or variant="horizontal" instead */
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
  const asset = resolveAsset(resolvedVariant);

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
        <p className="font-display text-[11px] font-normal leading-tight tracking-[0.08em] text-foreground">
          CONTINENTAL CARGO
        </p>
        <p className="mt-0.5 text-[9px] font-light tracking-[0.16em] text-subtle">
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
