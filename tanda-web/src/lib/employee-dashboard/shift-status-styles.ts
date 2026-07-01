import { AlertCircle, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import type { ShiftStatus } from '@/lib/types/shift';

export interface ShiftStatusMeta {
  label: string;
  chipClass: string;
  listCardClass: string;
  dayCardClass: string;
  todayRingClass: string;
  todayBadgeClass: string;
  icon: LucideIcon;
}

/** Scheduled shift surface aligned with dashboard cards. */
const SCHEDULED_SURFACE =
  'border-primary/35 bg-surface-base';

export const SHIFT_STATUS_META: Record<ShiftStatus, ShiftStatusMeta> = {
  scheduled: {
    label: 'Scheduled',
    chipClass:
      'bg-primary/15 text-primary ring-1 ring-primary/30',
    listCardClass: SCHEDULED_SURFACE,
    dayCardClass:
      'border-primary/40 bg-surface-base',
    todayRingClass: 'ring-2 ring-primary/45 ring-offset-2 ring-offset-surface-raised',
    todayBadgeClass: 'bg-primary/20 text-primary',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    chipClass: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
    listCardClass: 'border-emerald-500/30 bg-emerald-950/20',
    dayCardClass: 'border-emerald-500/30 bg-emerald-950/25',
    todayRingClass: 'ring-2 ring-emerald-400/45 ring-offset-2 ring-offset-surface-raised',
    todayBadgeClass: 'bg-emerald-500/25 text-emerald-100',
    icon: CheckCircle2,
  },
  absent: {
    label: 'Absent',
    chipClass: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    listCardClass: 'border-amber-500/35 bg-amber-950/20',
    dayCardClass: 'border-amber-500/35 bg-amber-950/20',
    todayRingClass: 'ring-2 ring-amber-400/45 ring-offset-2 ring-offset-surface-raised',
    todayBadgeClass: 'bg-amber-500/25 text-amber-100',
    icon: AlertCircle,
  },
};

export function getShiftStatusMeta(status: ShiftStatus): ShiftStatusMeta {
  return SHIFT_STATUS_META[status];
}
