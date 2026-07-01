import { FieldValue } from 'firebase-admin/firestore';
import { mapAnnouncementDoc } from '@/lib/announcements/map-announcement';
import { getAppBaseUrl } from '@/lib/app-url';
import { COLLECTIONS } from '@/lib/constants';
import {
  isResendConfigured,
  sendAnnouncementEmail,
} from '@/lib/email/send-announcement-email';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { buildAttendanceNotificationDocId } from '@/lib/notifications/build-attendance-notification';
import { sendPushNotification } from '@/lib/notifications/send-push';
import { isNotificationChannelEnabled } from '@/lib/notifications/notification-channels';
import { getNotificationChannelsForEmail } from '@/lib/notifications/server/notification-preferences';
import { isSystemPushEnabled } from '@/lib/notifications/server/system-push';
import { isPushConfigured } from '@/lib/notifications/vapid';
import type {
  Announcement,
  AnnouncementAudience,
  BroadcastAnnouncementInput,
} from '@/lib/types/announcement';

interface RecipientEmployee {
  docId: string;
  employeeId: string;
  name: string;
  email: string;
  pushSubscription?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildAnnouncementNotificationDocId(
  recipientEmail: string,
  announcementId: string,
): string {
  return buildAttendanceNotificationDocId(
    recipientEmail,
    'announcement',
    announcementId,
  );
}

function truncatePreview(body: string, maxLength = 160): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

async function loadActiveRecipients(input: {
  audience: AnnouncementAudience;
  audienceValue?: string;
  recipientEmails?: string[];
}): Promise<RecipientEmployee[]> {
  const selectedEmails =
    input.audience === 'selected'
      ? new Set(
          (input.recipientEmails ?? [])
            .map((email) => normalizeEmail(email))
            .filter(Boolean),
        )
      : null;

  const snapshot = await getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const email = typeof data.email === 'string' ? normalizeEmail(data.email) : '';
      if (!email) return null;

      const active = data.active !== false;
      if (!active) return null;

      const department = typeof data.department === 'string' ? data.department.trim() : '';
      const locationId =
        typeof data.locationId === 'string' ? data.locationId.trim() : '';

      if (input.audience === 'selected') {
        if (!selectedEmails?.has(email)) return null;
      } else if (input.audience === 'department') {
        const target = input.audienceValue?.trim() ?? '';
        if (!target || department !== target) return null;
      } else if (input.audience === 'location') {
        const target = input.audienceValue?.trim() ?? '';
        if (!target || locationId !== target) return null;
      }

      const recipient: RecipientEmployee = {
        docId: doc.id,
        employeeId: typeof data.employeeId === 'string' ? data.employeeId : '',
        name: typeof data.name === 'string' ? data.name : email,
        email,
      };

      if (typeof data.pushSubscription === 'string') {
        recipient.pushSubscription = data.pushSubscription;
      }

      return recipient;
    })
    .filter((recipient): recipient is RecipientEmployee => recipient !== null);
}

interface EmployeeAudienceProfile {
  email: string;
  active: boolean;
  department: string;
  locationId: string;
}

async function getEmployeeAudienceProfile(
  employeeEmail: string,
): Promise<EmployeeAudienceProfile | null> {
  const email = normalizeEmail(employeeEmail);
  if (!email) return null;

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  return {
    email,
    active: data.active !== false,
    department: typeof data.department === 'string' ? data.department.trim() : '',
    locationId: typeof data.locationId === 'string' ? data.locationId.trim() : '',
  };
}

export function employeeMatchesAnnouncementAudience(
  employee: EmployeeAudienceProfile,
  announcement: Pick<Announcement, 'audience' | 'audienceValue' | 'recipientEmails'>,
): boolean {
  if (!employee.active) return false;

  if (announcement.audience === 'all') {
    return true;
  }

  if (announcement.audience === 'selected') {
    const emails = announcement.recipientEmails ?? [];
    return emails.some((email) => normalizeEmail(email) === employee.email);
  }

  if (announcement.audience === 'department') {
    const target = announcement.audienceValue?.trim() ?? '';
    return Boolean(target) && employee.department === target;
  }

  if (announcement.audience === 'location') {
    const target = announcement.audienceValue?.trim() ?? '';
    return Boolean(target) && employee.locationId === target;
  }

  return false;
}

export async function broadcastAnnouncement(input: {
  payload: BroadcastAnnouncementInput;
  createdByEmail: string;
  createdByName?: string;
}): Promise<Announcement> {
  const title = input.payload.title.trim();
  const body = input.payload.body.trim();

  if (!title) {
    throw new Error('Title is required.');
  }

  if (!body) {
    throw new Error('Message is required.');
  }

  if (
    (input.payload.audience === 'department' ||
      input.payload.audience === 'location') &&
    !input.payload.audienceValue?.trim()
  ) {
    throw new Error('Select a department or location for this audience.');
  }

  if (input.payload.audience === 'selected') {
    const selectedCount =
      input.payload.recipientEmails?.map((email) => normalizeEmail(email)).filter(Boolean)
        .length ?? 0;
    if (selectedCount === 0) {
      throw new Error('Select at least one employee.');
    }
  }

  const recipients = await loadActiveRecipients({
    audience: input.payload.audience,
    audienceValue: input.payload.audienceValue,
    recipientEmails: input.payload.recipientEmails,
  });

  if (recipients.length === 0) {
    throw new Error('No active employees match this audience.');
  }

  const db = getAdminFirestore();
  const announcementRef = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc();
  const announcementId = announcementRef.id;
  const href = `/announcements#announcement-${announcementId}`;
  const preview = truncatePreview(body);
  const resendEnabled = isResendConfigured();
  const pushEnabled = isPushConfigured() && (await isSystemPushEnabled());

  let emailSentCount = 0;
  let notificationCount = 0;
  let pushSentCount = 0;

  for (const recipient of recipients) {
    const channels = await getNotificationChannelsForEmail(recipient.email);
    const inAppEnabled = isNotificationChannelEnabled(channels, 'announcement');

    if (inAppEnabled) {
      const notificationRef = db
        .collection(COLLECTIONS.NOTIFICATIONS)
        .doc(buildAnnouncementNotificationDocId(recipient.email, announcementId));

      await notificationRef.set(
        {
          recipientEmail: recipient.email,
          audience: 'employee',
          type: 'announcement',
          title,
          body: preview,
          href,
          read: false,
          dismissed: false,
          createdAt: FieldValue.serverTimestamp(),
          metadata: {
            announcementId,
          },
        },
        { merge: true },
      );
      notificationCount += 1;
    }

    if (resendEnabled) {
      try {
        const sent = await sendAnnouncementEmail({
          email: recipient.email,
          name: recipient.name,
          title,
          body,
          announcementId,
        });
        if (sent) emailSentCount += 1;
      } catch (error) {
        console.error('broadcastAnnouncement email', recipient.email, error);
      }
    }

    if (inAppEnabled && pushEnabled && recipient.pushSubscription?.trim()) {
      try {
        const result = await sendPushNotification(recipient.pushSubscription, {
          title,
          body: preview,
          url: href,
        });

        if (result.ok) {
          pushSentCount += 1;
        } else if (result.expired) {
          await db.collection(COLLECTIONS.EMPLOYEES).doc(recipient.docId).update({
            pushSubscription: FieldValue.delete(),
            notificationsEnabledAt: FieldValue.delete(),
          });
        }
      } catch (error) {
        console.error('broadcastAnnouncement push', recipient.email, error);
      }
    }
  }

  await announcementRef.set({
    title,
    body,
    audience: input.payload.audience,
    ...(input.payload.audienceValue?.trim()
      ? { audienceValue: input.payload.audienceValue.trim() }
      : {}),
    ...(input.payload.audience === 'selected'
      ? {
          recipientEmails: recipients.map((recipient) => recipient.email),
        }
      : {}),
    recipientCount: recipients.length,
    emailSentCount,
    notificationCount,
    pushSentCount,
    createdByEmail: normalizeEmail(input.createdByEmail),
    ...(input.createdByName?.trim() ? { createdByName: input.createdByName.trim() } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });

  const saved = await announcementRef.get();
  return mapAnnouncementDoc(saved.id, saved.data() ?? {});
}

export async function listAnnouncements(limit = 50): Promise<Announcement[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ANNOUNCEMENTS)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => mapAnnouncementDoc(doc.id, doc.data()));
}

export async function listAnnouncementsForEmployee(
  employeeEmail: string,
  limit = 100,
): Promise<Announcement[]> {
  const profile = await getEmployeeAudienceProfile(employeeEmail);
  if (!profile) return [];

  const announcements = await listAnnouncements(limit);
  return announcements.filter((announcement) =>
    employeeMatchesAnnouncementAudience(profile, announcement),
  );
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ANNOUNCEMENTS)
    .doc(id.trim())
    .get();

  if (!snapshot.exists) return null;
  return mapAnnouncementDoc(snapshot.id, snapshot.data() ?? {});
}

export async function employeeCanReadAnnouncement(
  announcementId: string,
  employeeEmail: string,
): Promise<boolean> {
  const announcement = await getAnnouncementById(announcementId);
  if (!announcement) return false;

  const profile = await getEmployeeAudienceProfile(employeeEmail);
  if (!profile) return false;

  return employeeMatchesAnnouncementAudience(profile, announcement);
}

export function getAnnouncementPublicUrl(announcementId: string): string {
  return `${getAppBaseUrl()}/announcements#announcement-${announcementId}`;
}

const NOTIFICATION_BATCH_SIZE = 400;

async function listAnnouncementNotificationDocs(announcementId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where('type', '==', 'announcement')
    .where('metadata.announcementId', '==', announcementId)
    .get();

  return snapshot.docs;
}

async function syncAnnouncementNotifications(
  announcementId: string,
  input: { title: string; body: string },
  mode: 'update' | 'delete',
): Promise<void> {
  const docs = await listAnnouncementNotificationDocs(announcementId);
  if (docs.length === 0) return;

  const db = getAdminFirestore();
  const preview = truncatePreview(input.body);
  const href = `/announcements#announcement-${announcementId}`;

  for (let index = 0; index < docs.length; index += NOTIFICATION_BATCH_SIZE) {
    const chunk = docs.slice(index, index + NOTIFICATION_BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      if (mode === 'delete') {
        batch.delete(doc.ref);
      } else {
        batch.update(doc.ref, {
          title: input.title,
          body: preview,
          href,
        });
      }
    }

    await batch.commit();
  }
}

export async function updateAnnouncement(
  id: string,
  input: { title: string; body: string },
): Promise<Announcement> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) {
    throw new Error('Title is required.');
  }

  if (!body) {
    throw new Error('Message is required.');
  }

  const ref = getAdminFirestore().collection(COLLECTIONS.ANNOUNCEMENTS).doc(id.trim());
  const existing = await ref.get();

  if (!existing.exists) {
    throw new Error('Announcement not found.');
  }

  await ref.update({
    title,
    body,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await syncAnnouncementNotifications(id, { title, body }, 'update');

  const snapshot = await ref.get();
  return mapAnnouncementDoc(snapshot.id, snapshot.data() ?? {});
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const trimmedId = id.trim();
  const ref = getAdminFirestore().collection(COLLECTIONS.ANNOUNCEMENTS).doc(trimmedId);
  const existing = await ref.get();

  if (!existing.exists) {
    throw new Error('Announcement not found.');
  }

  const data = existing.data() ?? {};
  const title = typeof data.title === 'string' ? data.title : '';
  const body = typeof data.body === 'string' ? data.body : '';

  await syncAnnouncementNotifications(trimmedId, { title, body }, 'delete');
  await ref.delete();
}
