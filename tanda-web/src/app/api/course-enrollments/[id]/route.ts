import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import {
  reviewCourseEnrollment,
  serializeCourseEnrollments,
  submitCourseEnrollment,
} from '@/lib/courses/server/course-enrollments-service';
import type {
  ReviewCourseEnrollmentInput,
  SubmitCourseEnrollmentInput,
} from '@/lib/types/course';

type PatchBody =
  | ({ action: 'submit' } & SubmitCourseEnrollmentInput)
  | ({ action: 'review' } & ReviewCourseEnrollmentInput);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as PatchBody;

    if (body.action === 'submit') {
      const employee = await loadEmployeeContext(request);
      if (!employee) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }

      const enrollment = await submitCourseEnrollment({
        enrollmentId: id,
        employee,
        payload: {
          evidenceUrl: body.evidenceUrl,
          evidencePath: body.evidencePath,
          evidenceFileName: body.evidenceFileName,
          employeeNotes: body.employeeNotes,
        },
      });

      return NextResponse.json({
        ok: true,
        enrollment: serializeCourseEnrollments([enrollment])[0],
      });
    }

    if (body.action === 'review') {
      const authContext = await loadAdminAccessFromRequest(request);
      if (!authContext) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }

      if (!canPerformAction(authContext.access, 'courses', 'manage')) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const enrollment = await reviewCourseEnrollment({
        enrollmentId: id,
        reviewerEmail: authContext.user.email,
        payload: {
          status: body.status,
          reviewNotes: body.reviewNotes,
        },
      });

      return NextResponse.json({
        ok: true,
        enrollment: serializeCourseEnrollments([enrollment])[0],
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not update enrollment.';
    console.error('PATCH /api/course-enrollments/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
