import { NextResponse } from 'next/server';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { canPerformAction } from '@/lib/auth/admin-permissions';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { listAllCourses } from '@/lib/courses/server/courses-service';
import { listAllEnrollments } from '@/lib/courses/server/course-enrollments-service';
import { listAllIssueReports } from '@/lib/issues/server/issue-reports-service';
import { mapInspectionDoc } from '@/lib/inspections/map-inspection';
import { toInputDate } from '@/lib/dates/input-date';

function parseDateParam(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(request: Request) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = parseDateParam(searchParams.get('start'));
    const end = parseDateParam(searchParams.get('end'));
    const access = authContext.access.modules;
    const canReadInspections = canPerformAction(
      authContext.access,
      'inspections',
      'read',
    );

    const [coursesBlock, issuesBlock, inspectionsBlock] = await Promise.all([
      access.courses
        ? buildCoursesMetrics().catch((error) => {
            console.error('ops-metrics courses', error);
            return null;
          })
        : Promise.resolve(null),
      access.issueReports
        ? buildIssuesMetrics().catch((error) => {
            console.error('ops-metrics issues', error);
            return null;
          })
        : Promise.resolve(null),
      access.inspections && canReadInspections
        ? buildInspectionsMetrics(start, end).catch((error) => {
            console.error('ops-metrics inspections', error);
            return null;
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      courses: coursesBlock,
      issues: issuesBlock,
      inspections: inspectionsBlock,
    });
  } catch (error) {
    console.error('GET /api/dashboard/ops-metrics', error);
    return NextResponse.json(
      { error: 'Could not load dashboard ops metrics.' },
      { status: 500 },
    );
  }
}

async function buildCoursesMetrics() {
  const [courses, enrollments] = await Promise.all([
    listAllCourses(),
    listAllEnrollments(),
  ]);

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const today = toInputDate(new Date());

  let awaitingReview = 0;
  let assigned = 0;
  let approved = 0;
  let rejected = 0;
  let overdue = 0;

  for (const enrollment of enrollments) {
    if (enrollment.status === 'submitted') awaitingReview += 1;
    if (enrollment.status === 'assigned') assigned += 1;
    if (enrollment.status === 'approved') approved += 1;
    if (enrollment.status === 'rejected') rejected += 1;

    if (enrollment.status === 'assigned' || enrollment.status === 'rejected') {
      const dueDate = courseById.get(enrollment.courseId)?.dueDate;
      if (dueDate && dueDate < today) overdue += 1;
    }
  }

  return {
    awaitingReview,
    assigned,
    approved,
    rejected,
    overdue,
    activeCourses: courses.filter((course) => course.active).length,
    byStatus: [
      { name: 'Assigned', value: assigned },
      { name: 'Awaiting review', value: awaitingReview },
      { name: 'Approved', value: approved },
      { name: 'Rejected', value: rejected },
    ].filter((item) => item.value > 0),
  };
}

async function buildIssuesMetrics() {
  const reports = await listAllIssueReports();
  let open = 0;
  let inProgress = 0;
  const byCategory = new Map<string, number>();

  for (const report of reports) {
    if (report.status === 'open') open += 1;
    if (report.status === 'in_progress') inProgress += 1;
    if (report.status === 'open' || report.status === 'in_progress') {
      const key = report.category || 'Other';
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }
  }

  return {
    open,
    inProgress,
    openTotal: open + inProgress,
    byCategory: Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  };
}

async function buildInspectionsMetrics(
  start: string | null,
  end: string | null,
) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.CARGO_INSPECTIONS)
    .orderBy('registeredAt', 'desc')
    .limit(800)
    .get();

  const inspections = snapshot.docs.map((document) =>
    mapInspectionDoc(document.id, document.data() as Record<string, unknown>),
  );

  const filtered = inspections.filter((inspection) => {
    if (!start && !end) return true;
    const created = inspection.registeredAt?.slice(0, 10);
    if (!created) return false;
    if (start && created < start) return false;
    if (end && created > end) return false;
    return true;
  });

  let identification = 0;
  let processed = 0;
  let loaded = 0;
  let withIssues = 0;

  for (const inspection of filtered) {
    if (inspection.status === 'processed') processed += 1;
    else if (inspection.status === 'loaded') loaded += 1;
    else identification += 1;
    if (inspection.hasIssues) withIssues += 1;
  }

  return {
    total: filtered.length,
    statusNew: identification,
    withIssues,
    byStatus: [
      { name: 'Identification', value: identification },
      { name: 'Processed', value: processed },
      { name: 'On truck', value: loaded },
    ].filter((item) => item.value > 0),
  };
}
