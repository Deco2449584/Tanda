import type { UserRole } from '@/lib/auth/roles';

/** Shared warehouse tablet for dedicated kiosk accounts; personal device for everyone else. */
export function resolveKioskDeviceMode(role: UserRole): 'tablet' | 'mobile' {
  return role === 'kiosk' ? 'tablet' : 'mobile';
}

export function isSharedKioskTabletMode(role: UserRole): boolean {
  return resolveKioskDeviceMode(role) === 'tablet';
}
