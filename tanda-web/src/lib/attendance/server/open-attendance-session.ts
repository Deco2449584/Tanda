import { compareInputDates } from '@/lib/dates/input-date';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import type { AttendanceRecord } from '@/lib/types/attendance';

function recordTimestamp(record: AttendanceRecord): number {
  return record.timestampServer?.toMillis() ?? 0;
}

/** Open check-in still active today (not forgotten). */
export function findOpenCheckInRecord(
  records: AttendanceRecord[],
  timeZone: string,
  at: Date = new Date(),
): AttendanceRecord | null {
  const today = toInputDateInTimeZone(timeZone, at);
  const sorted = [...records]
    .filter((record) => record.timestampServer != null)
    .sort((a, b) => recordTimestamp(a) - recordTimestamp(b));

  let pendingCheckIn: AttendanceRecord | null = null;

  for (const record of sorted) {
    if (record.type === 'check_in') {
      pendingCheckIn = record;
      continue;
    }

    if (record.type === 'check_out' && pendingCheckIn) {
      pendingCheckIn = null;
    }
  }

  if (!pendingCheckIn?.timestampServer) {
    return null;
  }

  const checkInDate = toInputDateInTimeZone(
    timeZone,
    pendingCheckIn.timestampServer.toDate(),
  );

  if (compareInputDates(checkInDate, today) < 0) {
    return null;
  }

  return pendingCheckIn;
}

export interface CheckoutLocationViolation {
  message: string;
}

export function validateCheckoutSameLocationAsCheckIn(input: {
  openCheckIn: AttendanceRecord | null;
  kioskLocationId: string;
}): CheckoutLocationViolation | null {
  const checkInLocationId = input.openCheckIn?.locationId?.trim();
  const kioskLocationId = input.kioskLocationId.trim();

  if (!checkInLocationId || !kioskLocationId) {
    return null;
  }

  if (checkInLocationId === kioskLocationId) {
    return null;
  }

  const locationLabel =
    input.openCheckIn?.locationNameSnapshot?.trim() ||
    'the warehouse where you checked in';

  return {
    message: `Check-out must be at the same warehouse as check-in (${locationLabel}).`,
  };
}
