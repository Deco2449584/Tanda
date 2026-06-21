import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { isPushConfigured } from '@/lib/notifications/vapid';
import { sendPushNotification } from '@/lib/notifications/send-push';

type ShiftNotificationType = 'assigned' | 'cancelled';

interface ShiftNotificationBody {
  type?: ShiftNotificationType;
  employeeId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  department?: string;
}

function buildShiftMessage(body: ShiftNotificationBody): {
  title: string;
  body: string;
} {
  const date = body.date?.trim() ?? '';
  const startTime = body.startTime?.trim() ?? '';
  const endTime = body.endTime?.trim() ?? '';
  const timeRange =
    startTime && endTime ? `${startTime}–${endTime}` : startTime || endTime;

  if (body.type === 'cancelled') {
    const detail = [date, timeRange].filter(Boolean).join(' · ');
    return {
      title: 'Shift cancelled',
      body: detail
        ? `Your shift on ${detail} has been cancelled.`
        : 'One of your shifts has been cancelled.',
    };
  }

  const detail = [date, timeRange].filter(Boolean).join(' · ');
  return {
    title: 'New shift assigned',
    body: detail
      ? `You have a new shift on ${detail}.`
      : 'You have a new shift on your schedule.',
  };
}

export async function POST(request: Request) {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as ShiftNotificationBody;

    if (body.type !== 'assigned' && body.type !== 'cancelled') {
      return NextResponse.json({ error: 'Invalid notification type.' }, { status: 400 });
    }

    const employeeId = body.employeeId?.trim();
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const snapshot = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .where('employeeId', '==', employeeId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const employeeDoc = snapshot.docs[0];
    const pushSubscription = employeeDoc.data().pushSubscription;

    if (typeof pushSubscription !== 'string' || !pushSubscription.trim()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const message = buildShiftMessage(body);
    const result = await sendPushNotification(pushSubscription, {
      ...message,
      url: '/my-schedule',
    });

    if (!result.ok && result.expired) {
      await employeeDoc.ref.update({
        pushSubscription: FieldValue.delete(),
        notificationsEnabledAt: FieldValue.delete(),
      });
    }

    return NextResponse.json({ ok: true, delivered: result.ok });
  } catch (error) {
    console.error('POST /api/notifications/shift', error);
    return NextResponse.json(
      { error: 'Could not send notification.' },
      { status: 500 },
    );
  }
}
