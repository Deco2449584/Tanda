'use client';

import { useCallback, useEffect, useState } from 'react';
import { MyCoursesPanel } from '@/components/courses/MyCoursesPanel';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import {
  fetchMyCourses,
  type SerializedCourse,
  type SerializedCourseEnrollment,
} from '@/lib/courses/courses-api';

export default function MyCoursesPage() {
  const { user, role } = useAuthRole();
  const { employee } = useCurrentEmployee(user?.email);
  const [courses, setCourses] = useState<SerializedCourse[]>([]);
  const [enrollments, setEnrollments] = useState<SerializedCourseEnrollment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyCourses();
      setCourses(data.courses);
      setEnrollments(data.enrollments);
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        text:
          error instanceof Error ? error.message : 'Could not load your courses.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="My courses"
        description="Complete assigned training before the deadline, then submit proof for manager approval."
      />

      <MyCoursesPanel
        courses={courses}
        enrollments={enrollments}
        employeeId={employee?.employeeId || employee?.id || role || 'employee'}
        loading={loading}
        onChanged={() => void load()}
        onError={(message) => {
          setToast({
            id: crypto.randomUUID(),
            text: message,
            variant: 'error',
          });
        }}
        onSuccess={(message) => {
          setToast({
            id: crypto.randomUUID(),
            text: message,
            variant: 'success',
          });
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
