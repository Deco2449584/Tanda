import { Timestamp } from 'firebase/firestore';
import {
  COURSE_CATEGORIES,
  COURSE_ENROLLMENT_STATUSES,
  type Course,
  type CourseCategory,
  type CourseEnrollment,
  type CourseEnrollmentStatus,
  type CourseEnrollmentFirestore,
  type CourseFirestore,
} from '@/lib/types/course';

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function parseCategory(value: unknown): CourseCategory {
  if (
    typeof value === 'string' &&
    (COURSE_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as CourseCategory;
  }
  return 'Other';
}

function parseStatus(value: unknown): CourseEnrollmentStatus {
  if (
    typeof value === 'string' &&
    (COURSE_ENROLLMENT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as CourseEnrollmentStatus;
  }
  return 'assigned';
}

export function mapCourseDoc(
  id: string,
  data: Record<string, unknown>,
): Course {
  const record = data as Partial<CourseFirestore>;

  return {
    id,
    title: typeof record.title === 'string' ? record.title : '',
    description: typeof record.description === 'string' ? record.description : '',
    externalUrl: typeof record.externalUrl === 'string' ? record.externalUrl : '',
    platformName:
      typeof record.platformName === 'string' ? record.platformName : undefined,
    category: parseCategory(record.category),
    active: record.active !== false,
    dueDate: typeof record.dueDate === 'string' ? record.dueDate : undefined,
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : 0,
    createdByEmail:
      typeof record.createdByEmail === 'string' ? record.createdByEmail : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function serializeCourse(course: Course) {
  return {
    ...course,
    createdAt: timestampToIso(course.createdAt),
    updatedAt: timestampToIso(course.updatedAt),
  };
}

export function mapCourseEnrollmentDoc(
  id: string,
  data: Record<string, unknown>,
): CourseEnrollment {
  const record = data as Partial<CourseEnrollmentFirestore>;

  return {
    id,
    courseId: typeof record.courseId === 'string' ? record.courseId : '',
    courseTitle: typeof record.courseTitle === 'string' ? record.courseTitle : '',
    employeeDocId:
      typeof record.employeeDocId === 'string' ? record.employeeDocId : '',
    employeeId: typeof record.employeeId === 'string' ? record.employeeId : '',
    employeeName:
      typeof record.employeeName === 'string' ? record.employeeName : '',
    employeeEmail:
      typeof record.employeeEmail === 'string' ? record.employeeEmail : '',
    status: parseStatus(record.status),
    evidenceUrl:
      typeof record.evidenceUrl === 'string' ? record.evidenceUrl : undefined,
    evidencePath:
      typeof record.evidencePath === 'string' ? record.evidencePath : undefined,
    evidenceFileName:
      typeof record.evidenceFileName === 'string'
        ? record.evidenceFileName
        : undefined,
    employeeNotes:
      typeof record.employeeNotes === 'string' ? record.employeeNotes : undefined,
    submittedAt: record.submittedAt,
    reviewedBy:
      typeof record.reviewedBy === 'string' ? record.reviewedBy : undefined,
    reviewedAt: record.reviewedAt,
    reviewNotes:
      typeof record.reviewNotes === 'string' ? record.reviewNotes : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function serializeCourseEnrollment(enrollment: CourseEnrollment) {
  return {
    ...enrollment,
    submittedAt: timestampToIso(enrollment.submittedAt),
    reviewedAt: timestampToIso(enrollment.reviewedAt),
    createdAt: timestampToIso(enrollment.createdAt),
    updatedAt: timestampToIso(enrollment.updatedAt),
  };
}
