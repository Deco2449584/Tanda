import type { ShiftConfirmationStatus } from '@/lib/types/shift';

export type ScheduleLegendKind =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'completed'
  | 'absent';

export const SCHEDULE_LEGEND_ITEMS: ReadonlyArray<{
  kind: ScheduleLegendKind;
  label: string;
  chip: string;
}> = [
  {
    kind: 'pending',
    label: 'Awaiting confirmation',
    chip: 'border-amber-500/45 bg-amber-500/15 text-amber-200',
  },
  {
    kind: 'confirmed',
    label: 'Confirmed by employee',
    chip: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
  },
  {
    kind: 'declined',
    label: 'Cannot attend',
    chip: 'border-red-500/45 bg-red-500/15 text-red-300',
  },
  {
    kind: 'completed',
    label: 'Completed',
    chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
  },
  {
    kind: 'absent',
    label: 'Absent',
    chip: 'border-orange-500/35 bg-orange-500/10 text-orange-400',
  },
] as const;

export function resolveShiftConfirmationStatus(
  status: ShiftConfirmationStatus | undefined,
): ShiftConfirmationStatus {
  return status ?? 'pending';
}

/** Pill / cell fill for scheduled shifts in grid and mobile. */
export function getScheduledShiftConfirmationPillClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return 'border-sky-500/50 bg-sky-500/15 text-sky-300';
    case 'declined':
      return 'border-red-500/45 bg-red-500/15 text-red-300';
    case 'pending':
    default:
      return 'border-amber-500/45 bg-amber-500/15 text-amber-200';
  }
}

/** Left accent on expanded shift cards for scheduled shifts. */
export function getScheduledShiftCardContainerClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return 'border-l-4 border-sky-500 bg-surface-overlay/90';
    case 'declined':
      return 'border-l-4 border-red-500 bg-surface-overlay/90';
    case 'pending':
    default:
      return 'border-l-4 border-amber-500 bg-surface-overlay/90';
  }
}

export function getScheduledShiftCompactContainerClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return 'border-l-2 border-sky-500 bg-surface-overlay/90';
    case 'declined':
      return 'border-l-2 border-red-500 bg-surface-overlay/90';
    case 'pending':
    default:
      return 'border-l-2 border-amber-500 bg-surface-overlay/90';
  }
}

export function getScheduledShiftIconClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return 'text-sky-400';
    case 'declined':
      return 'text-red-400';
    case 'pending':
    default:
      return 'text-amber-400';
  }
}
