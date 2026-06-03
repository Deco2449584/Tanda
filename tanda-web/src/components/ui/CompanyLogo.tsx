'use client';

import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';

interface CompanyLogoProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  invert?: boolean;
}

export function CompanyLogo({
  alt,
  className = 'h-16 w-auto object-contain',
  priority = false,
  invert = false,
}: CompanyLogoProps) {
  const { settings } = useCompanySettings();
  const label = alt ?? settings.companyName;

  if (settings.logoUrl) {
    return (
      <Image
        src={settings.logoUrl}
        alt={label}
        width={280}
        height={100}
        priority={priority}
        className={`${className}${invert ? ' brightness-0 invert' : ''}`}
        sizes="(max-width: 768px) 160px, 280px"
      />
    );
  }

  return (
    <Image
      src="/logo.svg"
      alt={label}
      width={280}
      height={100}
      priority={priority}
      className={`${className}${invert ? ' brightness-0 invert' : ''}`}
    />
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
