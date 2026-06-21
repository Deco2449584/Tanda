import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyEmployeeRequest } from '@/lib/auth/verify-employee-request';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employee.employeeDocId)
      .update({
        pushSubscription: FieldValue.delete(),
        notificationsEnabledAt: FieldValue.delete(),
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/notifications/unsubscribe', error);
    return NextResponse.json(
      { error: 'Could not remove subscription.' },
      { status: 500 },
    );
  }
}
