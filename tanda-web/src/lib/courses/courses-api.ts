import { auth } from '@/lib/firebase';
import type {
  AssignCourseInput,
  CreateCourseInput,
  ReviewCourseEnrollmentInput,
  SubmitCourseEnrollmentInput,
  UpdateCourseInput,
} from '@/lib/types/course';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) throw new Error('You must be signed in.');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface SerializedCourse {
  id: string;
  title: string;
  description: string;
  externalUrl: string;
  platformName?: string;
  category: string;
  active: boolean;
  dueDate?: string;
  sortOrder: number;
  createdByEmail?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SerializedCourseEnrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  status: 'assigned' | 'submitted' | 'approved' | 'rejected';
  evidenceUrl?: string;
  evidencePath?: string;
  evidenceFileName?: string;
  employeeNotes?: string;
  submittedAt: string | null;
  reviewedBy?: string;
  reviewedAt: string | null;
  reviewNotes?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function fetchCoursesAdmin(): Promise<SerializedCourse[]> {
  const response = await fetch('/api/courses', {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    courses?: SerializedCourse[];
    error?: string;
  } | null;
  if (!response.ok) throw new Error(data?.error ?? 'Could not load courses.');
  return data?.courses ?? [];
}

export async function createCourseRequest(
  payload: CreateCourseInput,
): Promise<SerializedCourse> {
  const response = await fetch('/api/courses', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    course?: SerializedCourse;
    error?: string;
  } | null;
  if (!response.ok || !data?.course) {
    throw new Error(data?.error ?? 'Could not create course.');
  }
  return data.course;
}

export async function updateCourseRequest(
  id: string,
  payload: UpdateCourseInput,
): Promise<SerializedCourse> {
  const response = await fetch(`/api/courses/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    course?: SerializedCourse;
    error?: string;
  } | null;
  if (!response.ok || !data?.course) {
    throw new Error(data?.error ?? 'Could not update course.');
  }
  return data.course;
}

export async function deleteCourseRequest(id: string): Promise<void> {
  const response = await fetch(`/api/courses/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? 'Could not delete course.');
  }
}

export async function assignCourseRequest(
  id: string,
  payload: AssignCourseInput,
): Promise<{ assigned: number; skipped: number }> {
  const response = await fetch(`/api/courses/${id}/assign`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    assignment?: { assigned: number; skipped: number };
    error?: string;
  } | null;
  if (!response.ok || !data?.assignment) {
    throw new Error(data?.error ?? 'Could not assign course.');
  }
  return data.assignment;
}

export async function fetchMyCourses(): Promise<{
  courses: SerializedCourse[];
  enrollments: SerializedCourseEnrollment[];
}> {
  const response = await fetch('/api/my-courses', {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    courses?: SerializedCourse[];
    enrollments?: SerializedCourseEnrollment[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load your courses.');
  }
  return {
    courses: data?.courses ?? [],
    enrollments: data?.enrollments ?? [],
  };
}

export async function fetchCourseEnrollmentsAdmin(params?: {
  status?: string;
}): Promise<SerializedCourseEnrollment[]> {
  const query = params?.status
    ? `?status=${encodeURIComponent(params.status)}`
    : '';
  const response = await fetch(`/api/course-enrollments${query}`, {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    enrollments?: SerializedCourseEnrollment[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load enrollments.');
  }
  return data?.enrollments ?? [];
}

export async function submitCourseEnrollmentRequest(
  id: string,
  payload: SubmitCourseEnrollmentInput,
): Promise<SerializedCourseEnrollment> {
  const response = await fetch(`/api/course-enrollments/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'submit', ...payload }),
  });
  const data = (await response.json().catch(() => null)) as {
    enrollment?: SerializedCourseEnrollment;
    error?: string;
  } | null;
  if (!response.ok || !data?.enrollment) {
    throw new Error(data?.error ?? 'Could not submit evidence.');
  }
  return data.enrollment;
}

export async function reviewCourseEnrollmentRequest(
  id: string,
  payload: ReviewCourseEnrollmentInput,
): Promise<SerializedCourseEnrollment> {
  const response = await fetch(`/api/course-enrollments/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'review', ...payload }),
  });
  const data = (await response.json().catch(() => null)) as {
    enrollment?: SerializedCourseEnrollment;
    error?: string;
  } | null;
  if (!response.ok || !data?.enrollment) {
    throw new Error(data?.error ?? 'Could not review enrollment.');
  }
  return data.enrollment;
}
