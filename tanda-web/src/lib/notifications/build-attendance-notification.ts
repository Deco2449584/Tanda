import type { AttendanceJustificationType } from '@/lib/types/attendance-justification';
import type { NotificationType } from '@/lib/types/notification';

export function buildAttendanceNotificationDocId(
  recipientEmail: string,
  type: NotificationType,
  shiftId: string,
): string {
  const emailKey = recipientEmail.trim().toLowerCase().replace(/[@.]/g, '_');
  return `${emailKey}__${type}__${shiftId}`;
}

export function buildJustificationDocId(
  employeeId: string,
  shiftId: string,
  type: AttendanceJustificationType,
): string {
  return `${employeeId.trim()}__${shiftId.trim()}__${type}`;
}

export function buildAttendanceNotificationContent(input: {
  type: 'justification_required' | 'no_show';
  justificationType: AttendanceJustificationType;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  lateMinutes?: number;
  justificationId: string;
}): {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  metadata: Record<string, string | number>;
} {
  const timeRange =
    input.startTime && input.endTime
      ? `${input.startTime}–${input.endTime}`
      : input.startTime || input.endTime;
  const detail = [input.date, timeRange].filter(Boolean).join(' · ');
  const href = `/my-schedule?justify=${encodeURIComponent(input.justificationId)}`;

  if (input.type === 'no_show' || input.justificationType === 'no_show') {
    return {
      type: 'no_show',
      title: 'No-show — explanation required',
      body: detail
        ? `You did not check in for your shift on ${detail}. Please submit an explanation.`
        : 'You missed a scheduled shift. Please submit an explanation.',
      href,
      metadata: {
        shiftId: input.shiftId,
        justificationId: input.justificationId,
      },
    };
  }

  const lateDetail =
    typeof input.lateMinutes === 'number' && input.lateMinutes > 0
      ? ` (${input.lateMinutes} min late)`
      : '';

  return {
    type: 'justification_required',
    title: 'Late arrival — justification required',
    body: detail
      ? `Your check-in for ${detail} was after the grace period${lateDetail}. Please explain.`
      : `Your check-in was after the grace period${lateDetail}. Please explain.`,
    href,
      metadata: {
        shiftId: input.shiftId,
        justificationId: input.justificationId,
        ...(typeof input.lateMinutes === 'number' ? { lateMinutes: input.lateMinutes } : {}),
      },
  };
}
