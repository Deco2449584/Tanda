import type { Timestamp } from 'firebase/firestore';

export const COURSE_CATEGORIES = [
  'Compliance',
  'Safety',
  'Operations',
  'Leadership',
  'Systems',
  'Other',
] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export interface CourseFirestore {
  title: string;
  description: string;
  externalUrl: string;
  /** Optional label for the external platform (e.g. LinkedIn Learning). */
  platformName?: string;
  category: CourseCategory;
  active: boolean;
  dueDate?: string;
  sortOrder: number;
  createdByEmail?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Course extends CourseFirestore {
  id: string;
}

export interface CreateCourseInput {
  title: string;
  description: string;
  externalUrl: string;
  platformName?: string;
  category: CourseCategory;
  dueDate?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  externalUrl?: string;
  platformName?: string | null;
  category?: CourseCategory;
  dueDate?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export const COURSE_ENROLLMENT_STATUSES = [
  'assigned',
  'submitted',
  'approved',
  'rejected',
] as const;
export type CourseEnrollmentStatus = (typeof COURSE_ENROLLMENT_STATUSES)[number];

export interface CourseEnrollmentFirestore {
  courseId: string;
  courseTitle: string;
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  status: CourseEnrollmentStatus;
  evidenceUrl?: string;
  evidencePath?: string;
  evidenceFileName?: string;
  employeeNotes?: string;
  submittedAt?: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CourseEnrollment extends CourseEnrollmentFirestore {
  id: string;
}

export interface SubmitCourseEnrollmentInput {
  evidenceUrl: string;
  evidencePath: string;
  evidenceFileName?: string;
  employeeNotes?: string;
}

export interface ReviewCourseEnrollmentInput {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

export const COURSE_ENROLLMENT_STATUS_LABELS: Record<
  CourseEnrollmentStatus,
  string
> = {
  assigned: 'To do',
  submitted: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Needs redo',
};
