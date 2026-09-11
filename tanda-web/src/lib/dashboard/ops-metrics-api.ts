import { auth } from '@/lib/firebase';
import type { NamedValueDatum } from '@/lib/dashboard/types';

export interface DashboardCoursesMetrics {
  awaitingReview: number;
  assigned: number;
  approved: number;
  rejected: number;
  overdue: number;
  activeCourses: number;
  byStatus: NamedValueDatum[];
}

export interface DashboardIssuesMetrics {
  open: number;
  inProgress: number;
  openTotal: number;
  byCategory: NamedValueDatum[];
}

export interface DashboardInspectionsMetrics {
  total: number;
  statusNew: number;
  withIssues: number;
  byStatus: NamedValueDatum[];
}

export interface DashboardOpsMetrics {
  courses: DashboardCoursesMetrics | null;
  issues: DashboardIssuesMetrics | null;
  inspections: DashboardInspectionsMetrics | null;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) throw new Error('You must be signed in.');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDashboardOpsMetrics(input: {
  start: string;
  end: string;
}): Promise<DashboardOpsMetrics> {
  const params = new URLSearchParams({
    start: input.start,
    end: input.end,
  });
  const response = await fetch(`/api/dashboard/ops-metrics?${params}`, {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as
    | (DashboardOpsMetrics & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load ops metrics.');
  }

  return {
    courses: data?.courses ?? null,
    issues: data?.issues ?? null,
    inspections: data?.inspections ?? null,
  };
}
