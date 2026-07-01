import type { Announcement } from '@/lib/types/announcement';

function toMillis(value: unknown): number {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export function mapAnnouncementDoc(
  id: string,
  data: Record<string, unknown>,
): Announcement {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    body: typeof data.body === 'string' ? data.body : '',
    audience:
      data.audience === 'department'
        ? 'department'
        : data.audience === 'location'
          ? 'location'
          : data.audience === 'selected'
            ? 'selected'
            : 'all',
    audienceValue:
      typeof data.audienceValue === 'string' ? data.audienceValue : undefined,
    recipientEmails: Array.isArray(data.recipientEmails)
      ? data.recipientEmails.filter((email): email is string => typeof email === 'string')
      : undefined,
    recipientCount:
      typeof data.recipientCount === 'number' ? data.recipientCount : 0,
    emailSentCount:
      typeof data.emailSentCount === 'number' ? data.emailSentCount : 0,
    notificationCount:
      typeof data.notificationCount === 'number' ? data.notificationCount : 0,
    pushSentCount:
      typeof data.pushSentCount === 'number' ? data.pushSentCount : 0,
    createdByEmail:
      typeof data.createdByEmail === 'string' ? data.createdByEmail : '',
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : undefined,
    createdAt: toMillis(data.createdAt),
  };
}
