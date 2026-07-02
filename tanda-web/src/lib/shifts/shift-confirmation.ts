import type { Shift, ShiftConfirmationStatus } from '@/lib/types/shift';
import { resolveShiftConfirmationStatus } from '@/lib/schedule/schedule-legend';

export { getScheduledShiftConfirmationPillClass } from '@/lib/schedule/schedule-legend';

export function needsShiftConfirmation(shift: Pick<Shift, 'status' | 'confirmationStatus'>): boolean {
  return (
    shift.status === 'scheduled' &&
    resolveShiftConfirmationStatus(shift.confirmationStatus) === 'pending'
  );
}

export function getShiftConfirmationLabel(status: ShiftConfirmationStatus | undefined): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return 'Confirmed';
    case 'declined':
      return 'Cannot attend';
    case 'pending':
      return 'Awaiting confirmation';
    default:
      return 'Awaiting confirmation';
  }
}

export function getShiftConfirmationChipClass(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/35';
    case 'declined':
      return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
    case 'pending':
    default:
      return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30';
  }
}

export function getShiftConfirmationShortCode(
  status: ShiftConfirmationStatus | undefined,
): string {
  switch (resolveShiftConfirmationStatus(status)) {
    case 'confirmed':
      return '✓';
    case 'declined':
      return '✗';
    case 'pending':
    default:
      return '…';
  }
}
