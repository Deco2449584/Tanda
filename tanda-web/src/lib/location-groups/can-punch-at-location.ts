import type { LocationGroup } from '@/lib/types/location-group';

export function canEmployeePunchAtLocation(
  group: LocationGroup | null | undefined,
  kioskLocationId: string,
): boolean {
  if (!group?.active || !kioskLocationId.trim()) {
    return false;
  }

  return group.locationIds.includes(kioskLocationId.trim());
}
