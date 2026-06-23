import { getLocationLabel } from '@/lib/locations/format-location';
import type { EmployeeLocationAccess } from '@/lib/location-groups/can-punch-at-location';
import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';

export function getLocationGroupLabel(
  locationGroupId: string | undefined,
  groups: readonly LocationGroup[],
): string {
  if (!locationGroupId?.trim()) return '—';

  const group = groups.find((item) => item.id === locationGroupId);
  return group?.name?.trim() || '—';
}

export function formatLocationGroupSites(
  group: LocationGroup,
  locations: readonly Location[],
): string {
  if (group.locationIds.length === 0) return 'No sites';

  return group.locationIds
    .map((id) => getLocationLabel(id, locations))
    .filter((label) => label !== '—')
    .join(', ');
}

export function employeeMatchesLocationFilter(
  employee: EmployeeLocationAccess,
  selectedLocationId: string,
  groups: readonly LocationGroup[],
): boolean {
  if (!selectedLocationId) return true;

  if (employee.locationId?.trim() === selectedLocationId) {
    return true;
  }

  const locationGroupId = employee.locationGroupId;
  if (!locationGroupId) return false;

  const group = groups.find((item) => item.id === locationGroupId);
  if (!group?.active) return false;

  return group.locationIds.includes(selectedLocationId);
}

export function getEmployeeLocationLabel(
  employee: EmployeeLocationAccess,
  locations: readonly Location[],
  groups: readonly LocationGroup[],
): string {
  const site = getLocationLabel(employee.locationId, locations);
  const group = getLocationGroupLabel(employee.locationGroupId, groups);

  if (site !== '—' && group !== '—') {
    return `${site} · ${group}`;
  }
  if (site !== '—') return site;
  if (group !== '—') return group;
  return '—';
}
