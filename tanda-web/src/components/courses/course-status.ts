import type { CourseEnrollmentStatus } from '@/lib/types/course';
import { COURSE_ENROLLMENT_STATUS_LABELS } from '@/lib/types/course';

export function courseStatusLabel(status: CourseEnrollmentStatus): string {
  return COURSE_ENROLLMENT_STATUS_LABELS[status] ?? status;
}

export function courseStatusBadgeClass(status: CourseEnrollmentStatus): string {
  switch (status) {
    case 'assigned':
      return 'bg-sky-500/15 text-sky-300';
    case 'submitted':
      return 'bg-amber-500/15 text-amber-300';
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'rejected':
      return 'bg-red-500/15 text-red-300';
    default:
      return 'bg-surface-overlay text-muted';
  }
}
