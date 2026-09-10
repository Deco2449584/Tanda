import { FieldValue } from 'firebase-admin/firestore';
import {
  mapCourseEnrollmentDoc,
  serializeCourseEnrollment,
} from '@/lib/courses/map-course';
import { getCourseById } from '@/lib/courses/server/courses-service';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { EmployeeContext } from '@/lib/auth/load-employee-context';
import type {
  Course,
  CourseEnrollment,
  ReviewCourseEnrollmentInput,
  SubmitCourseEnrollmentInput,
} from '@/lib/types/course';
import { isWorkforceEmployeeRole } from '@/lib/employees/is-workforce-employee';

function enrollmentDocId(courseId: string, employeeDocId: string): string {
  return `${courseId}_${employeeDocId}`;
}

export async function ensureEnrollmentForEmployee(input: {
  course: Course;
  employee: Pick<
    EmployeeContext,
    'employeeDocId' | 'employeeId' | 'name' | 'email'
  >;
}): Promise<CourseEnrollment> {
  const id = enrollmentDocId(input.course.id, input.employee.employeeDocId);
  const ref = getAdminFirestore().collection(COLLECTIONS.COURSE_ENROLLMENTS).doc(id);
  const existing = await ref.get();

  if (existing.exists) {
    return mapCourseEnrollmentDoc(existing.id, existing.data() ?? {});
  }

  await ref.set({
    courseId: input.course.id,
    courseTitle: input.course.title,
    employeeDocId: input.employee.employeeDocId,
    employeeId: input.employee.employeeId,
    employeeName: input.employee.name,
    employeeEmail: input.employee.email.trim().toLowerCase(),
    status: 'assigned',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await ref.get();
  return mapCourseEnrollmentDoc(snapshot.id, snapshot.data() ?? {});
}

/** Ensure the employee has an enrollment row for every active course. */
export async function syncEmployeeCourseEnrollments(
  employee: EmployeeContext,
  activeCourses: Course[],
): Promise<CourseEnrollment[]> {
  const enrollments: CourseEnrollment[] = [];
  for (const course of activeCourses) {
    enrollments.push(
      await ensureEnrollmentForEmployee({
        course,
        employee,
      }),
    );
  }

  return enrollments.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
}

export async function listEnrollmentsForEmployee(
  employeeEmail: string,
): Promise<CourseEnrollment[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .where('employeeEmail', '==', employeeEmail.trim().toLowerCase())
    .get();

  return snapshot.docs
    .map((document) => mapCourseEnrollmentDoc(document.id, document.data()))
    .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
}

export async function listAllEnrollments(): Promise<CourseEnrollment[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .get();

  return snapshot.docs
    .map((document) => mapCourseEnrollmentDoc(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.submittedAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.submittedAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function listSubmittedEnrollments(): Promise<CourseEnrollment[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .where('status', '==', 'submitted')
    .get();

  return snapshot.docs
    .map((document) => mapCourseEnrollmentDoc(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.submittedAt?.toMillis?.() ?? 0;
      const bTime = b.submittedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function getEnrollmentById(
  id: string,
): Promise<CourseEnrollment | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .doc(id.trim())
    .get();

  if (!snapshot.exists) return null;
  return mapCourseEnrollmentDoc(snapshot.id, snapshot.data() ?? {});
}

export async function submitCourseEnrollment(input: {
  enrollmentId: string;
  employee: EmployeeContext;
  payload: SubmitCourseEnrollmentInput;
}): Promise<CourseEnrollment> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .doc(input.enrollmentId.trim());
  const existing = await ref.get();

  if (!existing.exists) throw new Error('Enrollment not found.');

  const enrollment = mapCourseEnrollmentDoc(existing.id, existing.data() ?? {});
  if (enrollment.employeeEmail !== input.employee.email.trim().toLowerCase()) {
    throw new Error('You can only submit evidence for your own courses.');
  }

  if (enrollment.status === 'approved') {
    throw new Error('This course is already approved.');
  }

  const evidenceUrl = input.payload.evidenceUrl.trim();
  const evidencePath = input.payload.evidencePath.trim();
  if (!evidenceUrl || !evidencePath) {
    throw new Error('Upload completion evidence (screenshot or certificate).');
  }

  await ref.update({
    status: 'submitted',
    evidenceUrl,
    evidencePath,
    evidenceFileName: input.payload.evidenceFileName?.trim() || FieldValue.delete(),
    employeeNotes: input.payload.employeeNotes?.trim() || FieldValue.delete(),
    submittedAt: FieldValue.serverTimestamp(),
    reviewedBy: FieldValue.delete(),
    reviewedAt: FieldValue.delete(),
    reviewNotes: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await ref.get();
  return mapCourseEnrollmentDoc(snapshot.id, snapshot.data() ?? {});
}

export async function reviewCourseEnrollment(input: {
  enrollmentId: string;
  reviewerEmail: string;
  payload: ReviewCourseEnrollmentInput;
}): Promise<CourseEnrollment> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .doc(input.enrollmentId.trim());
  const existing = await ref.get();

  if (!existing.exists) throw new Error('Enrollment not found.');

  const enrollment = mapCourseEnrollmentDoc(existing.id, existing.data() ?? {});
  if (enrollment.status !== 'submitted' && enrollment.status !== 'rejected') {
    if (enrollment.status === 'approved') {
      throw new Error('This enrollment is already approved.');
    }
    throw new Error('Employee must submit evidence before review.');
  }

  if (input.payload.status !== 'approved' && input.payload.status !== 'rejected') {
    throw new Error('Review status must be approved or rejected.');
  }

  await ref.update({
    status: input.payload.status,
    reviewNotes: input.payload.reviewNotes?.trim() || FieldValue.delete(),
    reviewedBy: input.reviewerEmail.trim().toLowerCase(),
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await ref.get();
  return mapCourseEnrollmentDoc(snapshot.id, snapshot.data() ?? {});
}

/** When a course is deleted, remove related enrollments. */
export async function deleteEnrollmentsForCourse(courseId: string): Promise<number> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .where('courseId', '==', courseId.trim())
    .get();

  if (snapshot.empty) return 0;

  const db = getAdminFirestore();
  let deleted = 0;
  let batch = db.batch();
  let ops = 0;

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return deleted;
}

/**
 * Enroll specific employees on a course.
 * Skips employees that are inactive / non-workforce / already enrolled.
 */
export async function assignEnrollmentsForCourse(
  course: Course,
  employeeDocIds: string[],
): Promise<{ assigned: number; skipped: number }> {
  const uniqueIds = Array.from(
    new Set(
      employeeDocIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  );

  if (uniqueIds.length === 0) {
    throw new Error('Select at least one employee to assign.');
  }

  let assigned = 0;
  let skipped = 0;

  for (const employeeDocId of uniqueIds) {
    const document = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employeeDocId)
      .get();

    if (!document.exists) {
      skipped += 1;
      continue;
    }

    const data = document.data() ?? {};
    if (data.active === false) {
      skipped += 1;
      continue;
    }

    const role = typeof data.role === 'string' ? data.role : 'empleado';
    if (!isWorkforceEmployeeRole(role)) {
      skipped += 1;
      continue;
    }

    const email =
      typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!email) {
      skipped += 1;
      continue;
    }

    const before = await getAdminFirestore()
      .collection(COLLECTIONS.COURSE_ENROLLMENTS)
      .doc(enrollmentDocId(course.id, employeeDocId))
      .get();

    await ensureEnrollmentForEmployee({
      course,
      employee: {
        employeeDocId: document.id,
        employeeId:
          typeof data.employeeId === 'string' ? data.employeeId : document.id,
        name: typeof data.name === 'string' ? data.name : email,
        email,
      },
    });

    if (before.exists) {
      skipped += 1;
    } else {
      assigned += 1;
    }
  }

  return { assigned, skipped };
}

/** @deprecated Prefer assignEnrollmentsForCourse with explicit IDs. */
export async function seedEnrollmentsForCourse(course: Course): Promise<number> {
  const employeesSnap = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('active', '==', true)
    .get();

  const ids = employeesSnap.docs
    .filter((document) => {
      const data = document.data();
      const role = typeof data.role === 'string' ? data.role : 'empleado';
      return isWorkforceEmployeeRole(role);
    })
    .map((document) => document.id);

  const result = await assignEnrollmentsForCourse(course, ids);
  return result.assigned;
}

export async function refreshEnrollmentCourseTitles(
  courseId: string,
  courseTitle: string,
): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSE_ENROLLMENTS)
    .where('courseId', '==', courseId.trim())
    .get();

  if (snapshot.empty) return;

  const db = getAdminFirestore();
  let batch = db.batch();
  let ops = 0;

  for (const document of snapshot.docs) {
    batch.update(document.ref, {
      courseTitle,
      updatedAt: FieldValue.serverTimestamp(),
    });
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
}

export function serializeCourseEnrollments(enrollments: CourseEnrollment[]) {
  return enrollments.map(serializeCourseEnrollment);
}

// Re-export for callers that need course lookup in same module
export { getCourseById };
