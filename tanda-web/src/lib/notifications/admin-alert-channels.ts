import type {
  NotificationChannelKey,
  NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';

export const ADMIN_ALERT_CHANNEL_MAP: Record<string, NotificationChannelKey> = {
  leave_pending: 'leaveRequests',
  missing_checkin: 'attendance',
  no_show_today: 'attendance',
  late_today: 'attendance',
  forgotten_checkout: 'attendance',
};

export function isAdminAlertChannelEnabled(
  channels: NotificationChannelPreferences,
  alertId: string,
): boolean {
  const channel = ADMIN_ALERT_CHANNEL_MAP[alertId];
  if (!channel) return true;
  return channels[channel] === true;
}

export function filterAdminNotificationsByChannels<
  T extends { id: string },
>(items: T[], channels: NotificationChannelPreferences): T[] {
  return items.filter((item) => isAdminAlertChannelEnabled(channels, item.id));
}
