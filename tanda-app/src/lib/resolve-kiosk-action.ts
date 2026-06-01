import type { Timestamp } from 'firebase/firestore';

/** Local calendar date YYYY-MM-DD */
function toInputDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compareInputDates(a: string, b: string): number {
  return a.localeCompare(b);
}

function dateFromTimestamp(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Next kiosk action after PIN entry.
 * Matches web `work-sessions`: an open check-in from a prior day is "forgotten"
 * and does not require checkout — the employee starts a new check-in.
 */
export function resolveKioskAction(
  lastAction: string | undefined,
  lastTimestampServer: Timestamp | null | undefined,
): 'check_in' | 'check_out' {
  if (lastAction !== 'check_in') {
    return 'check_in';
  }

  if (!lastTimestampServer) {
    return 'check_out';
  }

  const lastDate = dateFromTimestamp(lastTimestampServer);
  const today = toInputDate();

  if (compareInputDates(lastDate, today) < 0) {
    return 'check_in';
  }

  return 'check_out';
}
