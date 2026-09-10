import { NextResponse } from 'next/server';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import {
  getCourseById,
  serializeCourses,
} from '@/lib/courses/server/courses-service';
import {
  listEnrollmentsForEmployee,
  serializeCourseEnrollments,
} from '@/lib/courses/server/course-enrollments-service';

export async function GET(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const enrollments = await listEnrollmentsForEmployee(employee.email);
    const courses = [];

    for (const enrollment of enrollments) {
      const course = await getCourseById(enrollment.courseId);
      if (course && course.active) {
        courses.push(course);
      }
    }

    // Only show enrollments whose course is still active (or keep rejected/submitted
    // even if course deactivated? Keep enrollment if course exists.)
    const visibleCourseIds = new Set(courses.map((course) => course.id));
    const visibleEnrollments = enrollments.filter((enrollment) => {
      if (visibleCourseIds.has(enrollment.courseId)) return true;
      // Keep non-assigned statuses even if course was deactivated.
      return enrollment.status !== 'assigned';
    });

    // Include deactivated courses still needed for history on submitted/approved/rejected
    for (const enrollment of visibleEnrollments) {
      if (visibleCourseIds.has(enrollment.courseId)) continue;
      const course = await getCourseById(enrollment.courseId);
      if (course) {
        courses.push(course);
        visibleCourseIds.add(course.id);
      }
    }

    return NextResponse.json({
      courses: serializeCourses(courses),
      enrollments: serializeCourseEnrollments(visibleEnrollments),
    });
  } catch (error) {
    console.error('GET /api/my-courses', error);
    return NextResponse.json(
      { error: 'Could not load your courses.' },
      { status: 500 },
    );
  }
}
