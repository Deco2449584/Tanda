import type { LocationGroup } from '@/lib/types/location-group';

export interface EmployeeLocationAccess {
  locationId?: string;
  locationGroupId?: string;
}

export function canEmployeePunchAtLocation(
  group: LocationGroup | null | undefined,
  kioskLocationId: string,
): boolean {
  if (!group?.active || !kioskLocationId.trim()) {
    return false;
  }

  return group.locationIds.includes(kioskLocationId.trim());
}

/** Primary site (`locationId`) or optional group sites. */
export function canEmployeePunchAtKiosk(
  employee: EmployeeLocationAccess,
  kioskLocationId: string,
  group: LocationGroup | null | undefined,
): boolean {
  const locationId = kioskLocationId.trim();
  if (!locationId) return false;

  const assignedLocationId = employee.locationId?.trim();
  if (assignedLocationId && assignedLocationId === locationId) {
    return true;
  }

  if (employee.locationGroupId?.trim() && group?.active) {
    return canEmployeePunchAtLocation(group, locationId);
  }

  return false;
}
