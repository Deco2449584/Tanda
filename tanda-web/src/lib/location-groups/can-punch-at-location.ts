import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';

export interface EmployeeLocationAccess {
  locationId?: string;
  locationGroupId?: string;
}

export function getEmployeeLocationGroup(
  employee: EmployeeLocationAccess,
  groups: readonly LocationGroup[],
): LocationGroup | null | undefined {
  const groupId = employee.locationGroupId?.trim();
  if (!groupId) return null;
  return groups.find((group) => group.id === groupId) ?? null;
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

export function isLocationAllowedForEmployee(
  employee: EmployeeLocationAccess,
  locationId: string,
  groups: readonly LocationGroup[],
): boolean {
  const group = getEmployeeLocationGroup(employee, groups);
  return canEmployeePunchAtKiosk(employee, locationId, group);
}

export function getAllowedLocationsForEmployee(
  employee: EmployeeLocationAccess,
  locations: readonly Location[],
  groups: readonly LocationGroup[],
): Location[] {
  const group = getEmployeeLocationGroup(employee, groups);
  const activeLocations = locations.filter((location) => location.active);

  return activeLocations.filter((location) =>
    canEmployeePunchAtKiosk(employee, location.id, group),
  );
}
