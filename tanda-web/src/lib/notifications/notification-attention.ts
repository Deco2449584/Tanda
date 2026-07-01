import type { NotificationType } from '@/lib/types/notification';

const ATTENTION_REQUIRED_TYPES = new Set<NotificationType>([
  'justification_required',
  'no_show',
]);

export function isAttentionRequiredNotification(type: NotificationType): boolean {
  return ATTENTION_REQUIRED_TYPES.has(type);
}

export function hasAttentionRequiredNotifications(
  notifications: ReadonlyArray<{ type: NotificationType }>,
): boolean {
  return notifications.some((notification) =>
    isAttentionRequiredNotification(notification.type),
  );
}
