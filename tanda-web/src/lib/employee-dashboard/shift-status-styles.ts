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

export const SHIFT_STATUS_META: Record<ShiftStatus, ShiftStatusMeta> = {
  scheduled: {
    label: 'Scheduled',
    chipClass: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
    listCardClass: 'border-sky-500/30 bg-sky-950/20',
    dayCardClass: 'border-sky-500/35 bg-sky-950/25',
    todayRingClass: 'ring-2 ring-sky-400/55 ring-offset-2 ring-offset-zinc-950',
    todayBadgeClass: 'bg-sky-500/25 text-sky-100',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    chipClass: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
    listCardClass: 'border-emerald-500/30 bg-emerald-950/20',
    dayCardClass: 'border-emerald-500/30 bg-emerald-950/25',
    todayRingClass: 'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-zinc-950',
    todayBadgeClass: 'bg-emerald-500/25 text-emerald-100',
    icon: CheckCircle2,
  },
  absent: {
    label: 'Absent',
    chipClass: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    listCardClass: 'border-amber-500/35 bg-amber-950/20',
    dayCardClass: 'border-amber-500/35 bg-amber-950/20',
    todayRingClass: 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-zinc-950',
    todayBadgeClass: 'bg-amber-500/25 text-amber-100',
    icon: AlertCircle,
  },
};

export function getShiftStatusMeta(status: ShiftStatus): ShiftStatusMeta {
  return SHIFT_STATUS_META[status];
}
