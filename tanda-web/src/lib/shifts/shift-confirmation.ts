import type { Shift, ShiftConfirmationStatus } from '@/lib/types/shift';

export function needsShiftConfirmation(shift: Pick<Shift, 'status' | 'confirmationStatus'>): boolean {
  return shift.status === 'scheduled' && shift.confirmationStatus === 'pending';
}

export function getShiftConfirmationLabel(status: ShiftConfirmationStatus | undefined): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'declined':
      return 'Cannot attend';
    case 'pending':
      return 'Awaiting confirmation';
    default:
      return '';
  }
}

export function getShiftConfirmationChipClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
    case 'declined':
      return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30';
    default:
      return '';
  }
}

/** Compact pill styles for schedule grid / mobile when shift is still scheduled. */
export function getScheduledShiftConfirmationPillClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (status) {
    case 'confirmed':
      return 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300';
    case 'declined':
      return 'border-red-500/45 bg-red-500/15 text-red-300';
    case 'pending':
      return 'border-amber-500/45 bg-amber-500/15 text-amber-200';
    default:
      return 'border-primary/35 bg-primary/15 text-primary';
  }
}

export function getShiftConfirmationShortCode(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (status) {
    case 'confirmed':
      return '✓';
    case 'declined':
      return '✗';
    case 'pending':
      return '…';
    default:
      return '';
  }
}

export const SHIFT_CONFIRMATION_LEGEND = [
  {
    status: 'pending' as const,
    label: 'Awaiting confirmation',
    chip: 'border-amber-500/45 bg-amber-500/15 text-amber-200',
  },
  {
    status: 'confirmed' as const,
    label: 'Confirmed by employee',
    chip: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300',
  },
  {
    status: 'declined' as const,
    label: 'Cannot attend',
    chip: 'border-red-500/45 bg-red-500/15 text-red-300',
  },
] as const;
