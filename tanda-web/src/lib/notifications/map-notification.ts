import type { AppNotification, NotificationFirestore, NotificationType } from '@/lib/types/notification';

const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'shift_assigned',
  'shift_cancelled',
  'announcement',
  'justification_required',
  'missing_checkin',
  'late_arrival',
  'no_show',
  'course_assigned',
  'course_approved',
  'course_rejected',
] as const;

function parseNotificationType(value: unknown): NotificationType {
  if (
    typeof value === 'string' &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  ) {
    return value as NotificationType;
  }
  return 'shift_assigned';
}

export function mapNotificationDoc(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  const record = data as Partial<NotificationFirestore>;

  return {
    id,
    recipientEmail:
      typeof record.recipientEmail === 'string'
        ? record.recipientEmail.trim().toLowerCase()
        : '',
    audience: record.audience === 'admin' ? 'admin' : 'employee',
    type: parseNotificationType(record.type),
    title: typeof record.title === 'string' ? record.title : 'Notification',
    body: typeof record.body === 'string' ? record.body : '',
    href: typeof record.href === 'string' ? record.href : '/',
    read: record.read === true,
    dismissed: record.dismissed === true,
    createdAt:
      record.createdAt && typeof record.createdAt.toMillis === 'function'
        ? record.createdAt.toMillis()
        : Date.now(),
    metadata:
      record.metadata && typeof record.metadata === 'object'
        ? (record.metadata as Record<string, string | number | boolean>)
        : undefined,
  };
}
