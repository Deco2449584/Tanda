import { NextResponse } from 'next/server';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import {
  listAllEnrollments,
  listSubmittedEnrollments,
  serializeCourseEnrollments,
} from '@/lib/courses/server/course-enrollments-service';

export async function GET(request: Request) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!authContext.access.modules.courses) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const enrollments =
      status === 'submitted'
        ? await listSubmittedEnrollments()
        : await listAllEnrollments();

    return NextResponse.json({
      enrollments: serializeCourseEnrollments(enrollments),
    });
  } catch (error) {
    console.error('GET /api/course-enrollments', error);
    return NextResponse.json(
      { error: 'Could not load enrollments.' },
      { status: 500 },
    );
  }
}
