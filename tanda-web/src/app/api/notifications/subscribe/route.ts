import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyEmployeeRequest } from '@/lib/auth/verify-employee-request';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/constants';
import { isPushConfigured } from '@/lib/notifications/vapid';
import { isSystemPushEnabled } from '@/lib/notifications/server/system-push';

export async function POST(request: Request) {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications are not configured.' },
        { status: 503 },
      );
    }

    if (!(await isSystemPushEnabled())) {
      return NextResponse.json(
        { error: 'Push notifications are disabled system-wide.' },
        { status: 403 },
      );
    }

    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as { subscription?: PushSubscriptionJSON };
    const subscription = body.subscription;

    if (
      !subscription?.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: 'Invalid push subscription.' },
        { status: 400 },
      );
    }

    await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employee.employeeDocId)
      .update({
        pushSubscription: JSON.stringify(subscription),
        notificationsEnabledAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/notifications/subscribe', error);
    return NextResponse.json(
      { error: 'Could not save subscription.' },
      { status: 500 },
    );
  }
}
