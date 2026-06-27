import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import {
  getLateMinutes,
  isCheckInLate,
  isNoShow,
  timeToMinutes,
} from '@/lib/attendance/evaluate-shift-attendance';
import { getMinutesInTimeZone, timestampToMinutesInTimeZone } from '@/lib/dates/timezone';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  buildAttendanceNotificationContent,
  buildAttendanceNotificationDocId,
  buildJustificationDocId,
} from '@/lib/notifications/build-attendance-notification';
import { sendPushNotification } from '@/lib/notifications/send-push';
import {
  isNotificationChannelEnabled,
} from '@/lib/notifications/notification-channels';
import { getNotificationChannelsForEmail } from '@/lib/notifications/server/notification-preferences';
import { isPushConfigured } from '@/lib/notifications/vapid';
import {
  DEFAULT_ATTENDANCE_POLICY,
  DEFAULT_COMPANY_SETTINGS,
  type AttendancePolicySettings,
  type CompanySettings,
} from '@/lib/types/company-settings';
import type { AttendanceJustificationType } from '@/lib/types/attendance-justification';

interface ShiftRow {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface EmployeeRow {
  docId: string;
  employeeId: string;
  email: string;
  name: string;
  pushSubscription?: string;
}

async function loadCompanySettings(): Promise<CompanySettings> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc('general')
    .get();

  if (!snapshot.exists) {
    return DEFAULT_COMPANY_SETTINGS;
  }

  const data = snapshot.data() ?? {};
  const policyRaw = data.attendancePolicy;
  const policy: AttendancePolicySettings =
    policyRaw && typeof policyRaw === 'object'
      ? {
          gracePeriodMinutes:
            typeof (policyRaw as Record<string, unknown>).gracePeriodMinutes === 'number'
              ? (policyRaw as Record<string, unknown>).gracePeriodMinutes as number
              : DEFAULT_ATTENDANCE_POLICY.gracePeriodMinutes,
          noShowAfterMinutes:
            typeof (policyRaw as Record<string, unknown>).noShowAfterMinutes === 'number'
              ? (policyRaw as Record<string, unknown>).noShowAfterMinutes as number
              : DEFAULT_ATTENDANCE_POLICY.noShowAfterMinutes,
        }
      : DEFAULT_ATTENDANCE_POLICY;

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    timeZone:
      typeof data.timeZone === 'string' ? data.timeZone : DEFAULT_COMPANY_SETTINGS.timeZone,
    attendancePolicy: policy,
  };
}

async function loadEmployeeByCode(employeeId: string): Promise<EmployeeRow | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('employeeId', '==', employeeId.trim())
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    docId: doc.id,
    employeeId: typeof data.employeeId === 'string' ? data.employeeId : employeeId,
    email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : '',
    name: typeof data.name === 'string' ? data.name : '',
    pushSubscription:
      typeof data.pushSubscription === 'string' ? data.pushSubscription : undefined,
  };
}

async function upsertJustification(input: {
  employee: EmployeeRow;
  shift: ShiftRow;
  type: AttendanceJustificationType;
  lateMinutes?: number;
}): Promise<string> {
  const db = getAdminFirestore();
  const docId = buildJustificationDocId(input.employee.employeeId, input.shift.id, input.type);
  const ref = db.collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS).doc(docId);
  const existing = await ref.get();

  if (existing.exists) {
    const status = existing.data()?.status;
    if (status === 'approved' || status === 'rejected') {
      return docId;
    }
    return docId;
  }

  await ref.set({
    employeeId: input.employee.employeeId,
    employeeEmail: input.employee.email,
    employeeName: input.employee.name,
    shiftId: input.shift.id,
    date: input.shift.date,
    shiftStartTime: input.shift.startTime,
    shiftEndTime: input.shift.endTime,
    type: input.type,
    reason: '',
    status: 'awaiting_employee',
    ...(typeof input.lateMinutes === 'number' ? { lateMinutes: input.lateMinutes } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docId;
}

async function upsertEmployeeNotification(input: {
  recipientEmail: string;
  shiftId: string;
  justificationId: string;
  type: 'justification_required' | 'no_show';
  justificationType: AttendanceJustificationType;
  date: string;
  startTime: string;
  endTime: string;
  lateMinutes?: number;
  pushSubscription?: string;
}): Promise<void> {
  const email = input.recipientEmail.trim().toLowerCase();
  if (!email) return;

  const content = buildAttendanceNotificationContent({
    type: input.type,
    justificationType: input.justificationType,
    shiftId: input.shiftId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    lateMinutes: input.lateMinutes,
    justificationId: input.justificationId,
  });

  const channels = await getNotificationChannelsForEmail(email);
  if (!isNotificationChannelEnabled(channels, content.type)) {
    return;
  }

  const docId = buildAttendanceNotificationDocId(email, content.type, input.shiftId);
  const ref = getAdminFirestore().collection(COLLECTIONS.NOTIFICATIONS).doc(docId);
  const existing = await ref.get();

  if (existing.exists && existing.data()?.dismissed !== true) {
    return;
  }

  await ref.set(
    {
      recipientEmail: email,
      audience: 'employee',
      type: content.type,
      title: content.title,
      body: content.body,
      href: content.href,
      read: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        ...content.metadata,
        shiftId: input.shiftId,
      },
    },
    { merge: true },
  );

  if (!isPushConfigured() || !input.pushSubscription?.trim()) {
    return;
  }

  const result = await sendPushNotification(input.pushSubscription, {
    title: content.title,
    body: content.body,
    url: content.href,
  });

  if (!result.ok && result.expired && input.pushSubscription) {
    const employeeSnapshot = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!employeeSnapshot.empty) {
      await employeeSnapshot.docs[0].ref.update({
        pushSubscription: FieldValue.delete(),
        notificationsEnabledAt: FieldValue.delete(),
      });
    }
  }
}

async function markShiftAbsent(shiftId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.SHIFTS).doc(shiftId).update({
    status: 'absent',
  });
}

export async function evaluateLateCheckIn(input: {
  employeeId: string;
  checkInAt: Date;
}): Promise<void> {
  const settings = await loadCompanySettings();
  const employee = await loadEmployeeByCode(input.employeeId);
  if (!employee?.email) return;

  const todayKey = toInputDateInTimeZone(settings.timeZone, input.checkInAt);
  const shiftsSnapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SHIFTS)
    .where('employeeId', '==', employee.employeeId)
    .where('date', '==', todayKey)
    .get();

  if (shiftsSnapshot.empty) return;

  const checkInMinutes = getMinutesInTimeZone(settings.timeZone, input.checkInAt);

  for (const shiftDoc of shiftsSnapshot.docs) {
    const data = shiftDoc.data();
    const shift: ShiftRow = {
      id: shiftDoc.id,
      employeeId: employee.employeeId,
      date: typeof data.date === 'string' ? data.date : todayKey,
      startTime: typeof data.startTime === 'string' ? data.startTime : '',
      endTime: typeof data.endTime === 'string' ? data.endTime : '',
    };

    const shiftStart = timeToMinutes(shift.startTime);
    if (!isCheckInLate(checkInMinutes, shiftStart, settings.attendancePolicy)) {
      continue;
    }

    const lateMinutes = getLateMinutes(
      checkInMinutes,
      shiftStart,
      settings.attendancePolicy,
    );

    const justificationId = await upsertJustification({
      employee,
      shift,
      type: 'late',
      lateMinutes,
    });

    await upsertEmployeeNotification({
      recipientEmail: employee.email,
      shiftId: shift.id,
      justificationId,
      type: 'justification_required',
      justificationType: 'late',
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      lateMinutes,
      pushSubscription: employee.pushSubscription,
    });
  }
}

export async function evaluateDailyAttendanceAlerts(): Promise<{
  noShowsProcessed: number;
  lateWithoutJustification: number;
}> {
  const settings = await loadCompanySettings();
  const now = new Date();
  const todayKey = toInputDateInTimeZone(settings.timeZone, now);
  const nowMinutes = getMinutesInTimeZone(settings.timeZone, now);

  const [shiftsSnapshot, attendanceSnapshot] = await Promise.all([
    getAdminFirestore()
      .collection(COLLECTIONS.SHIFTS)
      .where('date', '==', todayKey)
      .get(),
    getAdminFirestore()
      .collection(COLLECTIONS.ATTENDANCE_RECORDS)
      .where('timestampServer', '>=', new Date(`${todayKey}T00:00:00`))
      .where('timestampServer', '<=', new Date(`${todayKey}T23:59:59.999`))
      .get(),
  ]);

  const checkInsByEmployee = new Map<string, { minutes: number }>();

  attendanceSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.type !== 'check_in' || !data.timestampServer) return;
    const employeeId = typeof data.employeeId === 'string' ? data.employeeId : '';
    if (!employeeId) return;

    const ts = data.timestampServer as Timestamp;
    const minutes = timestampToMinutesInTimeZone(ts, settings.timeZone);
    const existing = checkInsByEmployee.get(employeeId);
    if (!existing || minutes < existing.minutes) {
      checkInsByEmployee.set(employeeId, { minutes });
    }
  });

  let noShowsProcessed = 0;
  let lateWithoutJustification = 0;

  for (const shiftDoc of shiftsSnapshot.docs) {
    const data = shiftDoc.data();
    const employeeId = typeof data.employeeId === 'string' ? data.employeeId : '';
    if (!employeeId) continue;

    const shift: ShiftRow = {
      id: shiftDoc.id,
      employeeId,
      date: typeof data.date === 'string' ? data.date : todayKey,
      startTime: typeof data.startTime === 'string' ? data.startTime : '',
      endTime: typeof data.endTime === 'string' ? data.endTime : '',
    };

    const shiftStart = timeToMinutes(shift.startTime);
    const checkIn = checkInsByEmployee.get(employeeId);
    const hasCheckIn = Boolean(checkIn);

    const employee = await loadEmployeeByCode(employeeId);
    if (!employee?.email) continue;

    if (
      !hasCheckIn &&
      isNoShow(shiftStart, nowMinutes, false, settings.attendancePolicy)
    ) {
      const justificationId = await upsertJustification({
        employee,
        shift,
        type: 'no_show',
      });

      await upsertEmployeeNotification({
        recipientEmail: employee.email,
        shiftId: shift.id,
        justificationId,
        type: 'no_show',
        justificationType: 'no_show',
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        pushSubscription: employee.pushSubscription,
      });

      if (data.status !== 'absent') {
        await markShiftAbsent(shift.id);
      }

      noShowsProcessed += 1;
      continue;
    }

    if (
      checkIn &&
      isCheckInLate(checkIn.minutes, shiftStart, settings.attendancePolicy)
    ) {
      const lateMinutes = getLateMinutes(
        checkIn.minutes,
        shiftStart,
        settings.attendancePolicy,
      );

      const justificationId = buildJustificationDocId(employeeId, shift.id, 'late');
      const justificationDoc = await getAdminFirestore()
        .collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS)
        .doc(justificationId)
        .get();

      if (!justificationDoc.exists) {
        await upsertJustification({ employee, shift, type: 'late', lateMinutes });
        await upsertEmployeeNotification({
          recipientEmail: employee.email,
          shiftId: shift.id,
          justificationId,
          type: 'justification_required',
          justificationType: 'late',
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          lateMinutes,
          pushSubscription: employee.pushSubscription,
        });
        lateWithoutJustification += 1;
      }
    }
  }

  return { noShowsProcessed, lateWithoutJustification };
}

export async function countPendingJustifications(): Promise<number> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS)
    .where('status', '==', 'pending')
    .get();

  return snapshot.docs.filter((doc) => {
    const data = doc.data();
    const reason = data.reason;
    return (
      data.type === 'no_show' &&
      typeof reason === 'string' &&
      reason.trim().length > 0
    );
  }).length;
}

export async function listJustifications(input: {
  status?: string;
  type?: string;
  employeeEmail?: string;
}): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const collectionRef = getAdminFirestore().collection(
    COLLECTIONS.ATTENDANCE_JUSTIFICATIONS,
  );

  if (input.employeeEmail) {
    const snapshot = await collectionRef
      .where('employeeEmail', '==', input.employeeEmail.trim().toLowerCase())
      .get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter((row) => !input.type || row.data.type === input.type);
  }

  if (input.status) {
    const snapshot = await collectionRef.where('status', '==', input.status).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter((row) => !input.type || row.data.type === input.type);
  }

  const snapshot = await collectionRef.get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((row) => !input.type || row.data.type === input.type);
}

export async function submitJustification(input: {
  employeeEmail: string;
  justificationId: string;
  reason: string;
}): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error('Reason is required.');
  }

  const ref = getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS)
    .doc(input.justificationId.trim());

  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error('Justification not found.');
  }

  const data = snapshot.data() ?? {};
  if (data.employeeEmail !== input.employeeEmail.trim().toLowerCase()) {
    throw new Error('Forbidden.');
  }

  if (data.status === 'approved' || data.status === 'rejected') {
    throw new Error('This justification was already reviewed.');
  }

  if (data.status === 'submitted') {
    throw new Error('This explanation was already submitted.');
  }

  const type = data.type === 'no_show' ? 'no_show' : 'late';

  await ref.update({
    reason,
    status: type === 'late' ? 'submitted' : 'pending',
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function reviewJustification(input: {
  justificationId: string;
  status: 'approved' | 'rejected';
  reviewerEmail: string;
  reviewerNote?: string;
}): Promise<void> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS)
    .doc(input.justificationId.trim());

  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error('Justification not found.');
  }

  const data = snapshot.data() ?? {};
  if (data.status !== 'pending' || data.type !== 'no_show') {
    throw new Error('Only pending no-show explanations can be reviewed.');
  }

  await ref.update({
    status: input.status,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedByEmail: input.reviewerEmail,
    adminAcknowledgedAt: FieldValue.serverTimestamp(),
    adminAcknowledgedByEmail: input.reviewerEmail,
    ...(input.reviewerNote?.trim()
      ? { reviewerNote: input.reviewerNote.trim() }
      : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function acknowledgeJustification(input: {
  justificationId: string;
  adminEmail: string;
}): Promise<void> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS)
    .doc(input.justificationId.trim());

  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error('Justification not found.');
  }

  const data = snapshot.data() ?? {};
  if (typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    throw new Error('This justification has no submitted reason yet.');
  }

  await ref.update({
    adminAcknowledgedAt: FieldValue.serverTimestamp(),
    adminAcknowledgedByEmail: input.adminEmail.trim().toLowerCase(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getJustificationById(
  justificationId: string,
  employeeEmail?: string,
): Promise<Record<string, unknown> | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS)
    .doc(justificationId.trim())
    .get();

  if (!snapshot.exists) return null;

  const data = snapshot.data() ?? {};
  if (
    employeeEmail &&
    data.employeeEmail !== employeeEmail.trim().toLowerCase()
  ) {
    return null;
  }

  return { id: snapshot.id, ...data };
}
