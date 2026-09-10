import type { PersonalProfileStatus } from '@/lib/types/employee';

export function normalizePersonalProfileStatus(
  status: PersonalProfileStatus | string | null | undefined,
): PersonalProfileStatus {
  if (
    status === 'Uploading' ||
    status === 'Pending' ||
    status === 'Approved' ||
    status === 'Rejected'
  ) {
    return status;
  }
  return 'none';
}

export function personalProfileStatusLabel(status: PersonalProfileStatus): string {
  switch (status) {
    case 'Uploading':
      return 'Uploading documents';
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

/** Reminder until profile is submitted (Pending/Uploading) or approved. */
export function employeeNeedsPersonalProfile(
  status: PersonalProfileStatus | string | null | undefined,
): boolean {
  const normalized = normalizePersonalProfileStatus(status);
  return normalized === 'none' || normalized === 'Rejected';
}

export function isPersonalProfileUnderReview(
  status: PersonalProfileStatus | string | null | undefined,
): boolean {
  const normalized = normalizePersonalProfileStatus(status);
  return normalized === 'Uploading' || normalized === 'Pending';
}
