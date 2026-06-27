import type { NotificationType } from '@/lib/types/notification';

export const NOTIFICATION_CHANNEL_KEYS = [
  'shifts',
  'announcements',
  'attendance',
] as const;

export type NotificationChannelKey = (typeof NOTIFICATION_CHANNEL_KEYS)[number];

export interface NotificationChannelPreferences {
  shifts: boolean;
  announcements: boolean;
  attendance: boolean;
}

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannelPreferences = {
  shifts: true,
  announcements: true,
  attendance: true,
};

export function mapNotificationChannels(
  raw: Partial<NotificationChannelPreferences> | null | undefined,
): NotificationChannelPreferences {
  return {
    shifts: raw?.shifts !== false,
    announcements: raw?.announcements !== false,
    attendance: raw?.attendance !== false,
  };
}

export function notificationTypeToChannel(
  type: NotificationType,
): NotificationChannelKey | null {
  switch (type) {
    case 'shift_assigned':
    case 'shift_cancelled':
      return 'shifts';
    case 'announcement':
      return 'announcements';
    case 'justification_required':
    case 'missing_checkin':
    case 'late_arrival':
    case 'no_show':
      return 'attendance';
    default:
      return null;
  }
}

export function isNotificationChannelEnabled(
  channels: NotificationChannelPreferences,
  type: NotificationType,
): boolean {
  const channel = notificationTypeToChannel(type);
  if (!channel) return true;
  return channels[channel] === true;
}

export const NOTIFICATION_CHANNEL_LABELS: Record<
  NotificationChannelKey,
  { title: string; description: string }
> = {
  shifts: {
    title: 'Schedule changes',
    description: 'New shifts assigned or cancelled on your roster.',
  },
  announcements: {
    title: 'Announcements',
    description: 'Company messages and broadcasts from management.',
  },
  attendance: {
    title: 'Attendance alerts',
    description: 'Late arrivals, no-shows, and justification requests.',
  },
};
