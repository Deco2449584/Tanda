import type { AwardReport } from '@/lib/payroll/award-calc';

export interface AccountingPeriodLock {
  start: string;
  end: string;
  lockedAt: string;
  lockedBy: string;
  snapshot: AwardReport;
}

export function periodLockId(start: string, end: string): string {
  return `${start}_${end}`;
}
