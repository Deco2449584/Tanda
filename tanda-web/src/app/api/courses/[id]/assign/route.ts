import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { getCourseById } from '@/lib/courses/server/courses-service';
import { assignEnrollmentsForCourse } from '@/lib/courses/server/course-enrollments-service';
import type { AssignCourseInput } from '@/lib/types/course';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (
      !canPerformAction(authContext.access, 'courses', 'manage') &&
      !canPerformAction(authContext.access, 'courses', 'update')
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    const body = (await request.json()) as AssignCourseInput;
    const employeeDocIds = Array.isArray(body.employeeDocIds)
      ? body.employeeDocIds
      : [];

    const assignment = await assignEnrollmentsForCourse(course, employeeDocIds);

    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not assign course.';
    console.error('POST /api/courses/[id]/assign', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
