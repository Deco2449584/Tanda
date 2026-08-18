import { NextResponse } from 'next/server';
import { requireAccountingAccess } from '@/lib/accounting/server/require-accounting-access';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { buildWorkSessionsFromRecords } from '@/lib/attendance/work-sessions';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapLocationDoc } from '@/lib/locations/map-location';
import {
  buildAwardReport,
  filterAwardSlices,
  groupAwardSlices,
} from '@/lib/payroll/award-calc';
import { mapPayRules } from '@/lib/payroll/map-pay-rules';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { DEFAULT_PAYROLL_ACCOUNTING } from '@/lib/types/company-settings';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';

const SETTINGS_DOC_ID = 'general';

export async function GET(request: Request) {
  try {
    const auth = await requireAccountingAccess(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const start = url.searchParams.get('start') ?? '';
    const end = url.searchParams.get('end') ?? '';
    if (!start || !end || start > end) {
      return NextResponse.json({ error: 'Valid start and end dates are required.' }, { status: 400 });
    }

    const groupBy = url.searchParams.get('groupBy');
    const locationId = url.searchParams.get('locationId') || undefined;
    const employeeDocId = url.searchParams.get('employeeDocId') || undefined;
    const department = url.searchParams.get('department') || undefined;
    const employmentTypeId = url.searchParams.get('employmentTypeId') || undefined;

    const db = getAdminFirestore();
    const settingsSnap = await db.collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_ID).get();
    const settingsData = settingsSnap.exists
      ? (settingsSnap.data() as Record<string, unknown>)
      : {};
    const payrollAccounting =
      settingsData.payrollAccounting && typeof settingsData.payrollAccounting === 'object'
        ? (settingsData.payrollAccounting as typeof DEFAULT_PAYROLL_ACCOUNTING)
        : DEFAULT_PAYROLL_ACCOUNTING;
    const rules = mapPayRules(settingsData.payRules, payrollAccounting);
    const timeZone =
      typeof settingsData.timeZone === 'string' ? settingsData.timeZone : 'Australia/Sydney';

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59.999`);

    const [employeesSnap, locationsSnap, attendanceSnap, shiftsSnap] = await Promise.all([
      db.collection(COLLECTIONS.EMPLOYEES).get(),
      db.collection(COLLECTIONS.LOCATIONS).get(),
      db
        .collection(COLLECTIONS.ATTENDANCE_RECORDS)
        .where('timestampServer', '>=', startDate)
        .where('timestampServer', '<=', endDate)
        .get(),
      db
        .collection(COLLECTIONS.SHIFTS)
        .where('date', '>=', start)
        .where('date', '<=', end)
        .get(),
    ]);

    const employees = employeesSnap.docs
      .map((doc) => mapEmployeeDoc(doc.id, doc.data() as Record<string, unknown>))
      .filter(isPayrollEligibleEmployee);
    const locations = locationsSnap.docs.map((doc) =>
      mapLocationDoc(doc.id, doc.data() as Record<string, unknown>),
    );
    const records = attendanceSnap.docs.map((doc) =>
      mapAttendanceDoc(doc.id, doc.data() as Record<string, unknown>),
    );
    const shifts = shiftsSnap.docs.map((doc) =>
      mapShiftDoc(doc.id, doc.data() as Record<string, unknown>),
    );

    const sessions = buildWorkSessionsFromRecords(records);
    const leaveSnap = await db.collection(COLLECTIONS.LEAVE_REQUESTS).get();
    const leaveRequests = leaveSnap.docs.map((doc) =>
      mapLeaveRequestDoc(doc.id, doc.data() as Record<string, unknown>),
    );
    const report = buildAwardReport({
      rules,
      timeZone: timeZone,
      employees,
      locations,
      sessions,
      shifts,
      dateRange: { start, end },
      leaveRequests,
    });

    const slices = filterAwardSlices(report.slices, {
      locationId,
      employeeDocId,
      department,
      employmentTypeId,
    });
    const grouped =
      groupBy === 'staff' ||
      groupBy === 'site' ||
      groupBy === 'date' ||
      groupBy === 'band' ||
      groupBy === 'employmentType'
        ? groupAwardSlices(slices, groupBy)
        : undefined;

    return NextResponse.json({
      totals: report.totals,
      incompleteSessions: report.incompleteSessions,
      slices,
      sessions: report.sessions,
      grouped,
    });
  } catch (error) {
    console.error('GET /api/accounting/report', error);
    return NextResponse.json({ error: 'Could not build accounting report.' }, { status: 500 });
  }
}
