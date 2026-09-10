'use client';

import { useCallback, useEffect, useState } from 'react';
import { CoursesAdminPanel } from '@/components/courses/CoursesAdminPanel';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  fetchCourseEnrollmentsAdmin,
  fetchCoursesAdmin,
  type SerializedCourse,
  type SerializedCourseEnrollment,
} from '@/lib/courses/courses-api';
import { useEmployees } from '@/providers/EmployeesProvider';

export default function CoursesAdminPage() {
  const { canAccessModule, canPerformAction } = useAdminAccess();
  const canView = canAccessModule('courses');
  const { employees, loading: employeesLoading } = useEmployees();
  const [courses, setCourses] = useState<SerializedCourse[]>([]);
  const [enrollments, setEnrollments] = useState<SerializedCourseEnrollment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCourses, nextEnrollments] = await Promise.all([
        fetchCoursesAdmin(),
        fetchCourseEnrollmentsAdmin(),
      ]);
      setCourses(nextCourses);
      setEnrollments(nextEnrollments);
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        text: error instanceof Error ? error.message : 'Could not load courses.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  if (!canView) {
    return (
      <PageContent>
        <PageHeader title="Courses" description="You do not have access to courses." />
      </PageContent>
    );
  }

  const pageLoading = employeesLoading || (loading && courses.length === 0);

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Courses"
        description="Assign external training to selected staff, collect evidence, and approve completions."
      />

      {pageLoading ? (
        <LoadingIndicator message="Loading courses…" />
      ) : (
        <CoursesAdminPanel
          courses={courses}
          enrollments={enrollments}
          employees={employees}
          loading={loading}
          canCreate={canPerformAction('courses', 'create')}
          canUpdate={canPerformAction('courses', 'update')}
          canDelete={canPerformAction('courses', 'delete')}
          canManage={canPerformAction('courses', 'manage')}
          onChanged={() => {
            setToast({
              id: crypto.randomUUID(),
              text: 'Courses updated.',
              variant: 'success',
            });
            void load();
          }}
          onError={(message) => {
            setToast({
              id: crypto.randomUUID(),
              text: message,
              variant: 'error',
            });
          }}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
