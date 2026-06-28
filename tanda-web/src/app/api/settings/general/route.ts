import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { isMasterRole } from '@/lib/auth/roles';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { CompanySettings } from '@/lib/types/company-settings';
import {
  clearAllEmployeePushSubscriptions,
} from '@/lib/notifications/server/system-push';

const SETTINGS_DOC_ID = 'general';

export async function PUT(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as CompanySettings;
    const docRef = getAdminFirestore().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_ID);
    const beforeSnapshot = await docRef.get();
    const before = beforeSnapshot.exists
      ? (beforeSnapshot.data() as Record<string, unknown>)
      : null;

    const adminSnapshot = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .where('email', '==', admin.email)
      .limit(1)
      .get();
    const adminData = adminSnapshot.docs[0]?.data();
    const adminRole = resolveRoleFromEmployee({
      role: typeof adminData?.role === 'string' ? adminData.role : undefined,
      department: typeof adminData?.department === 'string' ? adminData.department : undefined,
    });

    const existingPushEnabled = before?.pushNotificationsEnabled !== false;
    let pushNotificationsEnabled = existingPushEnabled;
    if (typeof body.pushNotificationsEnabled === 'boolean' && isMasterRole(adminRole)) {
      pushNotificationsEnabled = body.pushNotificationsEnabled;
    }

    const payload = {
      timeZone: body.timeZone,
      currency: body.currency,
      attendanceBreak: body.attendanceBreak,
      attendancePolicy: body.attendancePolicy,
      attendanceRestrictions: body.attendanceRestrictions,
      ...(body.defaultDepartmentName
        ? { defaultDepartmentName: body.defaultDepartmentName }
        : {}),
      pushNotificationsEnabled,
    };

    const wasEnabled = existingPushEnabled;
    const nowEnabled = pushNotificationsEnabled;

    await docRef.set(payload, { merge: true });

    if (wasEnabled && !nowEnabled) {
      await clearAllEmployeePushSubscriptions();
    }

    await recordAuditFromRequest(request, admin, {
      action: 'settings.changed',
      entityType: 'settings',
      entityId: SETTINGS_DOC_ID,
      summary: 'Updated company settings',
      before,
      after: payload as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/settings/general', error);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }
}
