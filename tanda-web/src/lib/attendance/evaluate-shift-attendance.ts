import type { AttendancePolicySettings } from '@/lib/types/company-settings';

export function timeToMinutes(time: string): number {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function isCheckInLate(
  checkInMinutes: number,
  shiftStartMinutes: number,
  policy: AttendancePolicySettings,
): boolean {
  return checkInMinutes > shiftStartMinutes + policy.gracePeriodMinutes;
}

export function getLateMinutes(
  checkInMinutes: number,
  shiftStartMinutes: number,
  policy: AttendancePolicySettings,
): number {
  const threshold = shiftStartMinutes + policy.gracePeriodMinutes;
  return Math.max(0, checkInMinutes - threshold);
}

export function isMissingCheckIn(
  shiftStartMinutes: number,
  nowMinutes: number,
  hasCheckIn: boolean,
  policy: AttendancePolicySettings,
): boolean {
  if (hasCheckIn) return false;
  return nowMinutes > shiftStartMinutes + policy.gracePeriodMinutes;
}

export function isNoShow(
  shiftStartMinutes: number,
  nowMinutes: number,
  hasCheckIn: boolean,
  policy: AttendancePolicySettings,
): boolean {
  if (hasCheckIn) return false;
  return nowMinutes >= shiftStartMinutes + policy.noShowAfterMinutes;
}
