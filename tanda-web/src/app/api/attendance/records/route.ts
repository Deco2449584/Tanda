import { NextResponse } from 'next/server';
import { getRequestIp } from '@/lib/audit/server/audit-log-service';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import {
  buildManualCreateAuditSummary,
  pickAttendanceAuditSnapshot,
} from '@/lib/audit/attendance-audit-helpers';
import {
  createAttendanceRecordAdmin,
  getEmployeeSnapshot,
  syncEmployeePresence,
} from '@/lib/attendance/server/attendance-records-admin';
import {
  logAttendanceRestrictionBlocked,
  validateEmployeeCheckInRestrictions,
} from '@/lib/attendance/server/validate-attendance-restrictions';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import type { AttendanceType } from '@/lib/types/attendance';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      employeeDocId?: string;
      type?: AttendanceType;
      timestampMs?: number;
      source?: 'web-admin-manual' | 'web-admin-manual-checkout';
      locationId?: string | null;
      locationNameSnapshot?: string | null;
      locationCitySnapshot?: string | null;
      latitude?: number;
      longitude?: number;
      geoAccuracy?: number;
      geoAddress?: string;
      breakWaived?: boolean;
      syncEmployeePresence?: boolean;
      overrideRestrictions?: boolean;
    };

    const employeeDocId = body.employeeDocId?.trim();
    if (!employeeDocId) {
      return NextResponse.json({ error: 'Employee is required.' }, { status: 400 });
    }

    if (body.type !== 'check_in' && body.type !== 'check_out') {
      return NextResponse.json({ error: 'Invalid record type.' }, { status: 400 });
    }

    if (typeof body.timestampMs !== 'number' || !Number.isFinite(body.timestampMs)) {
      return NextResponse.json({ error: 'Valid timestamp is required.' }, { status: 400 });
    }

    const source =
      body.source === 'web-admin-manual-checkout'
        ? 'web-admin-manual-checkout'
        : 'web-admin-manual';

    const employee = await getEmployeeSnapshot(employeeDocId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const employeeCode =
      typeof employee.data.employeeId === 'string' ? employee.data.employeeId : '';
    const employeeName =
      typeof employee.data.name === 'string' ? employee.data.name : 'Employee';
    const employeeEmail =
      typeof employee.data.email === 'string' ? employee.data.email : '';

    if (!employeeCode) {
      return NextResponse.json({ error: 'Employee code missing.' }, { status: 400 });
    }

    if (body.type === 'check_in') {
      const punchAt = new Date(body.timestampMs);
      const violation = await validateEmployeeCheckInRestrictions({
        employeeId: employeeCode,
        punchAt,
        overrideRestrictions: body.overrideRestrictions === true,
      });

      if (violation) {
        await logAttendanceRestrictionBlocked({
          actorEmail: admin.email,
          actorUid: admin.uid,
          employeeId: employeeCode,
          employeeName,
          channel: 'admin_manual',
          violation,
          punchAt,
          ipAddress: getRequestIp(request),
          metadata: { attemptedOverride: false },
        });

        return NextResponse.json(
          {
            error: violation.message,
            restrictionViolation: true,
            code: violation.code,
          },
          { status: 409 },
        );
      }
    }

    const recordId = await createAttendanceRecordAdmin({
      employeeId: employeeCode,
      employeeNameSnapshot: employeeName,
      employeeEmailSnapshot: employeeEmail,
      type: body.type,
      timestampMs: body.timestampMs,
      source,
      createdByEmail: admin.email,
      createdByUid: admin.uid,
      locationId: body.locationId ?? undefined,
      locationNameSnapshot: body.locationNameSnapshot ?? undefined,
      locationCitySnapshot: body.locationCitySnapshot ?? undefined,
      latitude: body.latitude,
      longitude: body.longitude,
      geoAccuracy: body.geoAccuracy,
      geoAddress: body.geoAddress,
      breakWaived: body.breakWaived,
    });

    if (body.syncEmployeePresence) {
      await syncEmployeePresence({
        employeeDocId,
        type: body.type,
        timestampMs: body.timestampMs,
      });
    }

    const afterSnapshot = {
      type: body.type,
      employeeId: employeeCode,
      employeeNameSnapshot: employeeName,
      timestampServer: body.timestampMs,
      source,
      locationId: body.locationId ?? null,
      locationNameSnapshot: body.locationNameSnapshot ?? null,
      breakWaived: body.type === 'check_out' ? (body.breakWaived ?? false) : null,
    };

    await recordAuditFromRequest(request, admin, {
      action: 'attendance.manual_created',
      entityType: 'attendance_record',
      entityId: recordId,
      summary: buildManualCreateAuditSummary({
        employeeName: employeeName,
        type: body.type,
        timestampMs: body.timestampMs,
        source,
      }),
      before: null,
      after: pickAttendanceAuditSnapshot(afterSnapshot),
      metadata: {
        manual: true,
        source,
        employeeDocId,
        restrictionsOverridden: body.overrideRestrictions === true,
      },
    });

    return NextResponse.json({ ok: true, id: recordId });
  } catch (error) {
    console.error('POST /api/attendance/records', error);
    return NextResponse.json({ error: 'Could not create attendance record.' }, { status: 500 });
  }
}
