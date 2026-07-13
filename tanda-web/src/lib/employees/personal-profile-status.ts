import type { PersonalProfileStatus } from '@/lib/types/employee';

export function normalizePersonalProfileStatus(
  status: PersonalProfileStatus | string | null | undefined,
): PersonalProfileStatus {
  if (status === 'Pending' || status === 'Approved' || status === 'Rejected') {
    return status;
  }
  return 'none';
}

export function personalProfileStatusLabel(status: PersonalProfileStatus): string {
  switch (status) {
    case 'Pending':
      return 'Pending review';
    case 'Approved':
      return 'Approved';
    case 'Rejected':
      return 'Rejected';
    default:
      return 'Not submitted';
  }
}
