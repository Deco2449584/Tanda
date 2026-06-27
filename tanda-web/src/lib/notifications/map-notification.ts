import type { AppNotification, NotificationFirestore } from '@/lib/types/notification';

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
    type:
      record.type === 'shift_cancelled'
        ? 'shift_cancelled'
        : record.type === 'announcement'
          ? 'announcement'
          : record.type === 'justification_required'
            ? 'justification_required'
            : record.type === 'missing_checkin'
              ? 'missing_checkin'
              : record.type === 'late_arrival'
                ? 'late_arrival'
                : 'shift_assigned',
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
