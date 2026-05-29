import {
  compareInputDates,
  normalizeInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import type { Shift } from '@/lib/types/shift';

function timeToMinutes(time: string): number {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/** Turno programado estrictamente en el futuro (fecha > hoy, o hoy con startTime > ahora). */
export function isShiftStrictlyUpcoming(shift: Shift, now: Date = new Date()): boolean {
  const today = toInputDate(now);
  const shiftDate = normalizeInputDate(shift.date);
  const dateCompare = compareInputDates(shiftDate, today);

  if (dateCompare > 0) return true;
  if (dateCompare < 0) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(shift.startTime) > nowMinutes;
}
