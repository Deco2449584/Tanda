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

export async function fetchDashboardOpsMetrics(input: {
  start: string;
  end: string;
}): Promise<DashboardOpsMetrics> {
  const params = new URLSearchParams({
    start: input.start,
    end: input.end,
  });

  const user = auth?.currentUser;
  if (!user) {
    return {
      courses: null,
      issues: null,
      inspections: null,
    };
  }

  const token = await user.getIdToken();
  const response = await fetch(`/api/dashboard/ops-metrics?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await response.text();
  let data: (DashboardOpsMetrics & { error?: string }) | null = null;
  try {
    data = JSON.parse(raw) as DashboardOpsMetrics & { error?: string };
  } catch {
    // Non-JSON (often a Next.js HTML error page when the server is stale).
  }

  if (!response.ok) {
    const detail = data?.error ?? `HTTP ${response.status}`;
    console.warn('fetchDashboardOpsMetrics failed:', detail);
    return {
      courses: null,
      issues: null,
      inspections: null,
    };
  }

  return {
    courses: data?.courses ?? null,
    issues: data?.issues ?? null,
    inspections: data?.inspections ?? null,
  };
}
