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
