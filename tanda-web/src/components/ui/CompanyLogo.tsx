'use client';

import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COMPANY_NAME } from '@/lib/types/company-settings';

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
  const label = alt ?? COMPANY_NAME;

  return (
    <Image
      src="/logo.svg"
      alt={label}
      width={548}
      height={480}
      priority={priority}
      className={cn('object-contain object-center', invert && 'brightness-0 invert', className)}
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
