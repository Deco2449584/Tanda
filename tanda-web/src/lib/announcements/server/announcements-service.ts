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
}): Promise<RecipientEmployee[]> {
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

      if (input.audience === 'department') {
        const target = input.audienceValue?.trim() ?? '';
        if (!target || department !== target) return null;
      }

      if (input.audience === 'location') {
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

  const recipients = await loadActiveRecipients({
    audience: input.payload.audience,
    audienceValue: input.payload.audienceValue,
  });

  if (recipients.length === 0) {
    throw new Error('No active employees match this audience.');
  }

  const db = getAdminFirestore();
  const announcementRef = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc();
  const announcementId = announcementRef.id;
  const href = `/announcements/${announcementId}`;
  const preview = truncatePreview(body);
  const resendEnabled = isResendConfigured();
  const pushEnabled = isPushConfigured();

  let emailSentCount = 0;
  let notificationCount = 0;
  let pushSentCount = 0;

  for (const recipient of recipients) {
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

    if (pushEnabled && recipient.pushSubscription?.trim()) {
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
  const email = normalizeEmail(employeeEmail);
  const notificationId = buildAnnouncementNotificationDocId(email, announcementId);
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.NOTIFICATIONS)
    .doc(notificationId)
    .get();

  return snapshot.exists;
}

export function getAnnouncementPublicUrl(announcementId: string): string {
  return `${getAppBaseUrl()}/announcements/${announcementId}`;
}
