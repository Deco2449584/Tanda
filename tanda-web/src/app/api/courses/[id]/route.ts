import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import {
  deleteCourse,
  serializeCourses,
  updateCourse,
} from '@/lib/courses/server/courses-service';
import {
  deleteEnrollmentsForCourse,
  refreshEnrollmentCourseTitles,
  seedEnrollmentsForCourse,
} from '@/lib/courses/server/course-enrollments-service';
import { getCourseById } from '@/lib/courses/server/courses-service';
import type { UpdateCourseInput } from '@/lib/types/course';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'courses', 'update')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateCourseInput;
    const course = await updateCourse(id, body);

    if (typeof body.title === 'string') {
      await refreshEnrollmentCourseTitles(course.id, course.title);
    }

    if (body.active === true) {
      await seedEnrollmentsForCourse(course);
    }

    return NextResponse.json({
      ok: true,
      course: serializeCourses([course])[0],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not update course.';
    console.error('PATCH /api/courses/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'courses', 'delete')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await getCourseById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    await deleteEnrollmentsForCourse(id);
    await deleteCourse(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not delete course.';
    console.error('DELETE /api/courses/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
