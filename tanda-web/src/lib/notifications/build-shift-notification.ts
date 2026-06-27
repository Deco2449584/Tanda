import type { NotificationType } from '@/lib/types/notification';

export type EmployeeShiftAlertType = 'assigned' | 'cancelled';

export function shiftTypeToNotificationType(
  type: EmployeeShiftAlertType,
): NotificationType {
  return type === 'cancelled' ? 'shift_cancelled' : 'shift_assigned';
}

export function buildShiftNotificationContent(input: {
  type: EmployeeShiftAlertType;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
}): {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  metadata: Record<string, string>;
} {
  const timeRange =
    input.startTime && input.endTime
      ? `${input.startTime}–${input.endTime}`
      : input.startTime || input.endTime;
  const detail = [input.date, timeRange].filter(Boolean).join(' · ');

  if (input.type === 'cancelled') {
    return {
      type: 'shift_cancelled',
      title: 'Shift cancelled',
      body: detail
        ? `Your shift on ${detail} was cancelled.`
        : 'One of your shifts was cancelled.',
      href: '/my-schedule',
      metadata: { shiftId: input.shiftId },
    };
  }

  return {
    type: 'shift_assigned',
    title: 'New shift assigned',
    body: detail
      ? `You have a new shift on ${detail}.`
      : 'You have a new shift on your schedule.',
    href: '/my-schedule',
    metadata: { shiftId: input.shiftId },
  };
}

export function buildShiftNotificationDocId(
  recipientEmail: string,
  type: EmployeeShiftAlertType,
  shiftId: string,
): string {
  const emailKey = recipientEmail.trim().toLowerCase().replace(/[@.]/g, '_');
  return `${emailKey}__${type}__${shiftId}`;
}
