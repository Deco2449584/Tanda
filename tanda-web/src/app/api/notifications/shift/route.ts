import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { upsertEmployeeShiftNotification } from '@/lib/notifications/server/shift-notification-service';

type ShiftNotificationType = 'assigned' | 'cancelled';

interface ShiftNotificationBody {
  type?: ShiftNotificationType;
  employeeId?: string;
  shiftId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as ShiftNotificationBody;

    if (body.type !== 'assigned' && body.type !== 'cancelled') {
      return NextResponse.json({ error: 'Invalid notification type.' }, { status: 400 });
    }

    const employeeCode = body.employeeId?.trim();
    const shiftId = body.shiftId?.trim();

    if (!employeeCode || !shiftId) {
      return NextResponse.json(
        { error: 'Employee ID and shift ID are required.' },
        { status: 400 },
      );
    }

    const snapshot = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .where('employeeId', '==', employeeCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const employeeDoc = snapshot.docs[0];
    const employeeData = employeeDoc.data();
    const recipientEmail =
      typeof employeeData.email === 'string' ? employeeData.email.trim().toLowerCase() : '';

    if (!recipientEmail) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const pushSubscription =
      typeof employeeData.pushSubscription === 'string'
        ? employeeData.pushSubscription
        : null;

    const employeeName =
      typeof employeeData.name === 'string' ? employeeData.name : '';

    const result = await upsertEmployeeShiftNotification({
      recipientEmail,
      employeeName,
      employeeDocId: employeeDoc.id,
      type: body.type,
      shiftId,
      date: body.date?.trim() ?? '',
      startTime: body.startTime?.trim(),
      endTime: body.endTime?.trim(),
      pushSubscription,
    });

    return NextResponse.json({
      ok: true,
      inApp: result.inApp,
      push: result.push,
      email: result.email,
    });
  } catch (error) {
    console.error('POST /api/notifications/shift', error);
    return NextResponse.json(
      { error: 'Could not send notification.' },
      { status: 500 },
    );
  }
}
