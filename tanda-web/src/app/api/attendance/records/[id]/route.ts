import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  buildAttendanceDeleteAuditSummary,
  buildAttendanceEditAuditSummary,
  pickAttendanceAuditSnapshot,
} from '@/lib/audit/attendance-audit-helpers';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import {
  deleteAttendanceRecordAdmin,
  getAttendanceRecordSnapshot,
  updateAttendanceRecordAdmin,
} from '@/lib/attendance/server/attendance-records-admin';
import { reconcileEmployeePresenceByCode } from '@/lib/attendance/server/employee-presence';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      type?: string;
      timestampServer?: unknown;
      locationId?: string | null;
      locationNameSnapshot?: string | null;
      locationCitySnapshot?: string | null;
      breakWaived?: boolean | null;
      timestampMs?: number;
      kioskDeviceId?: string | null;
      kioskDeviceNameSnapshot?: string | null;
      kioskDeviceType?: 'tablet' | 'mobile' | null;
    };

    const existing = await getAttendanceRecordSnapshot(id);
    if (!existing) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.type === 'check_in' || body.type === 'check_out') {
      update.type = body.type;
    }

    if (typeof body.timestampMs === 'number' && Number.isFinite(body.timestampMs)) {
      update.timestampServer = Timestamp.fromMillis(body.timestampMs);
    } else if (body.timestampServer !== undefined) {
      update.timestampServer = body.timestampServer;
    }

    if (body.locationId === null) {
      update.locationId = FieldValue.delete();
      update.locationNameSnapshot = FieldValue.delete();
      update.locationCitySnapshot = FieldValue.delete();
    } else if (typeof body.locationId === 'string') {
      update.locationId = body.locationId;
      update.locationNameSnapshot = body.locationNameSnapshot ?? null;
      update.locationCitySnapshot = body.locationCitySnapshot ?? null;
    }

    if (body.breakWaived === null) {
      update.breakWaived = FieldValue.delete();
    } else if (typeof body.breakWaived === 'boolean') {
      update.breakWaived = body.breakWaived;
    }

    if (body.kioskDeviceId === null || body.kioskDeviceId === '') {
      update.kioskDeviceId = FieldValue.delete();
      update.kioskDeviceNameSnapshot = FieldValue.delete();
      update.kioskDeviceType = FieldValue.delete();
    } else if (typeof body.kioskDeviceId === 'string') {
      update.kioskDeviceId = body.kioskDeviceId;
      update.kioskDeviceNameSnapshot = body.kioskDeviceNameSnapshot ?? null;
      if (body.kioskDeviceType === 'tablet' || body.kioskDeviceType === 'mobile') {
        update.kioskDeviceType = body.kioskDeviceType;
      } else {
        update.kioskDeviceType = FieldValue.delete();
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No changes provided.' }, { status: 400 });
    }

    await updateAttendanceRecordAdmin(id, update, admin);

    const employeeCode =
      typeof existing.data.employeeId === 'string' ? existing.data.employeeId : '';
    if (employeeCode) {
      await reconcileEmployeePresenceByCode(employeeCode);
    }

    const after = await getAttendanceRecordSnapshot(id);
    const employeeName =
      typeof existing.data.employeeNameSnapshot === 'string'
        ? existing.data.employeeNameSnapshot
        : String(existing.data.employeeId ?? 'employee');

    const auditDetails = buildAttendanceEditAuditSummary({
      employeeName,
      before: existing.data,
      after: after?.data ?? existing.data,
    });

    await recordAuditFromRequest(request, admin, {
      action: auditDetails.action,
      entityType: 'attendance_record',
      entityId: id,
      summary: auditDetails.summary,
      before: pickAttendanceAuditSnapshot(existing.data),
      after: after ? pickAttendanceAuditSnapshot(after.data) : null,
      metadata: {
        manual: true,
        timestampChanged: auditDetails.timestampChanged,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/attendance/records/[id]', error);
    return NextResponse.json({ error: 'Could not update attendance record.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await getAttendanceRecordSnapshot(id);
    if (!existing) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    const employeeName =
      typeof existing.data.employeeNameSnapshot === 'string'
        ? existing.data.employeeNameSnapshot
        : String(existing.data.employeeId ?? 'employee');

    const employeeCode =
      typeof existing.data.employeeId === 'string' ? existing.data.employeeId : '';

    await deleteAttendanceRecordAdmin(id);

    if (employeeCode) {
      await reconcileEmployeePresenceByCode(employeeCode);
    }

    await recordAuditFromRequest(request, admin, {
      action: 'attendance.deleted',
      entityType: 'attendance_record',
      entityId: id,
      summary: buildAttendanceDeleteAuditSummary({
        employeeName,
        data: existing.data,
      }),
      before: pickAttendanceAuditSnapshot(existing.data),
      after: null,
      metadata: { manual: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/attendance/records/[id]', error);
    return NextResponse.json({ error: 'Could not delete attendance record.' }, { status: 500 });
  }
}
