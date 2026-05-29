import { Timestamp } from 'firebase/firestore';
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

function toInputTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function timestampToFormValues(timestamp: Timestamp | null): {
  date: string;
  time: string;
} {
  const date = timestamp?.toDate() ?? new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: toInputTime(date),
  };
}

export function formValuesToTimestamp(date: string, time: string): Timestamp {
  const [hours, minutes] = time.split(':').map(Number);
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setHours(hours || 0, minutes || 0, 0, 0);
  return Timestamp.fromDate(parsed);
}
