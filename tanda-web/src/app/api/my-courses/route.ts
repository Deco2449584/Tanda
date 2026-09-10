import { NextResponse } from 'next/server';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { listActiveCourses, serializeCourses } from '@/lib/courses/server/courses-service';
import {
  serializeCourseEnrollments,
  syncEmployeeCourseEnrollments,
} from '@/lib/courses/server/course-enrollments-service';

export async function GET(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const courses = await listActiveCourses();
    const enrollments = await syncEmployeeCourseEnrollments(employee, courses);

    return NextResponse.json({
      courses: serializeCourses(courses),
      enrollments: serializeCourseEnrollments(enrollments),
    });
  } catch (error) {
    console.error('GET /api/my-courses', error);
    return NextResponse.json(
      { error: 'Could not load your courses.' },
      { status: 500 },
    );
  }
}
