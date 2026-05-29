import type { Timestamp } from 'firebase/firestore';
import type { AttendanceType } from '@/lib/types/attendance';

export function formatAttendanceType(type: AttendanceType | string): string {
  if (type === 'check_in') return 'Check-in';
  if (type === 'check_out') return 'Check-out';
  return type;
}

export function formatRecordDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '—';

  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatRecordTime(timestamp: Timestamp | null): string {
  if (!timestamp) return '—';

  return timestamp.toDate().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRecordTimestamp(timestamp: Timestamp | null): string {
  if (!timestamp) return '—';

  return `${formatRecordDate(timestamp)} ${formatRecordTime(timestamp)}`;
}
