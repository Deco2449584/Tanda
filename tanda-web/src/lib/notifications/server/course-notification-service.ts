import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { isNotificationChannelEnabled } from '@/lib/notifications/notification-channels';
import { getNotificationChannelsForEmail } from '@/lib/notifications/server/notification-preferences';
import type { NotificationType } from '@/lib/types/notification';

function buildCourseNotificationDocId(
  recipientEmail: string,
  type: NotificationType,
  enrollmentId: string,
): string {
  const emailKey = recipientEmail.trim().toLowerCase().replace(/[@.]/g, '_');
  return `${emailKey}__${type}__${enrollmentId}`;
}

async function upsertEmployeeCourseNotification(input: {
  recipientEmail: string;
  type: 'course_assigned' | 'course_approved' | 'course_rejected';
  title: string;
  body: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
}): Promise<boolean> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  if (!recipientEmail || !input.enrollmentId.trim()) return false;

  const channels = await getNotificationChannelsForEmail(recipientEmail);
  if (!isNotificationChannelEnabled(channels, input.type)) {
    return false;
  }

  const docId = buildCourseNotificationDocId(
    recipientEmail,
    input.type,
    input.enrollmentId,
  );
  const ref = getAdminFirestore().collection(COLLECTIONS.NOTIFICATIONS).doc(docId);
  const existing = await ref.get();

  if (existing.exists && existing.data()?.dismissed !== true) {
    // Refresh content on re-notify (e.g. reassigned after reject decision).
    if (input.type === 'course_assigned') {
      return true;
    }
  }

  await ref.set(
    {
      recipientEmail,
      audience: 'employee',
      type: input.type,
      title: input.title,
      body: input.body,
      href: '/my-courses',
      read: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        enrollmentId: input.enrollmentId,
        courseId: input.courseId,
        courseTitle: input.courseTitle,
      },
    },
    { merge: true },
  );

  return true;
}

export async function notifyCourseAssigned(input: {
  recipientEmail: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  dueDate?: string;
}): Promise<void> {
  const dueLine = input.dueDate
    ? ` Complete it by ${input.dueDate}.`
    : '';
  try {
    await upsertEmployeeCourseNotification({
      recipientEmail: input.recipientEmail,
      type: 'course_assigned',
      title: 'New course assigned',
      body: `You have been assigned “${input.courseTitle}”.${dueLine} Open My courses to start.`,
      enrollmentId: input.enrollmentId,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
    });
  } catch (error) {
    console.error('notifyCourseAssigned', error);
  }
}

export async function notifyCourseReviewed(input: {
  recipientEmail: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}): Promise<void> {
  const notes = input.reviewNotes?.trim();
  try {
    if (input.status === 'approved') {
      await upsertEmployeeCourseNotification({
        recipientEmail: input.recipientEmail,
        type: 'course_approved',
        title: 'Course approved',
        body: `“${input.courseTitle}” was approved by your manager.${
          notes ? ` Note: ${notes}` : ''
        }`,
        enrollmentId: input.enrollmentId,
        courseId: input.courseId,
        courseTitle: input.courseTitle,
      });
      return;
    }

    await upsertEmployeeCourseNotification({
      recipientEmail: input.recipientEmail,
      type: 'course_rejected',
      title: 'Course needs redo',
      body: `“${input.courseTitle}” was not approved.${
        notes ? ` Note: ${notes}` : ' Please complete it again and resubmit evidence.'
      }`,
      enrollmentId: input.enrollmentId,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
    });
  } catch (error) {
    console.error('notifyCourseReviewed', error);
  }
}
