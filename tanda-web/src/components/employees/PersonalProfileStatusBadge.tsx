'use client';

import {
  normalizePersonalProfileStatus,
  personalProfileStatusLabel,
} from '@/lib/employees/personal-profile-status';
import type { PersonalProfileStatus } from '@/lib/types/employee';

const statusStyles: Record<
  PersonalProfileStatus,
  string
> = {
  none: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
  Pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Rejected: 'border-red-500/30 bg-red-500/10 text-red-400',
};

export function PersonalProfileStatusBadge({
  status,
  compact = false,
}: {
  status: PersonalProfileStatus | string | null | undefined;
  compact?: boolean;
}) {
  const normalized = normalizePersonalProfileStatus(status);
  const sizeClass = compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border font-semibold ${statusStyles[normalized]} ${sizeClass}`}
    >
      {personalProfileStatusLabel(normalized)}
    </span>
  );
}
