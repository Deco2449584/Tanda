import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import {
  createCourse,
  listAllCourses,
  serializeCourses,
} from '@/lib/courses/server/courses-service';
import { assignEnrollmentsForCourse } from '@/lib/courses/server/course-enrollments-service';
import type { CreateCourseInput } from '@/lib/types/course';

export async function GET(request: Request) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!authContext.access.modules.courses) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const courses = await listAllCourses();
    return NextResponse.json({ courses: serializeCourses(courses) });
  } catch (error) {
    console.error('GET /api/courses', error);
    return NextResponse.json({ error: 'Could not load courses.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'courses', 'create')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = (await request.json()) as CreateCourseInput;
    const assigneeEmployeeDocIds = Array.isArray(body.assigneeEmployeeDocIds)
      ? body.assigneeEmployeeDocIds
      : [];

    if (assigneeEmployeeDocIds.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one employee to assign this course.' },
        { status: 400 },
      );
    }

    const course = await createCourse({
      payload: body,
      createdByEmail: authContext.user.email,
    });

    const assignment = await assignEnrollmentsForCourse(
      course,
      assigneeEmployeeDocIds,
    );

    return NextResponse.json({
      ok: true,
      course: serializeCourses([course])[0],
      assignment,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not create course.';
    console.error('POST /api/courses', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
