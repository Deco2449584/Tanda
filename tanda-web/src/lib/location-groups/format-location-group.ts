import { getLocationLabel } from '@/lib/locations/format-location';
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
  locationGroupId: string | undefined,
  selectedLocationId: string,
  groups: readonly LocationGroup[],
): boolean {
  if (!selectedLocationId) return true;
  if (!locationGroupId) return false;

  const group = groups.find((item) => item.id === locationGroupId);
  if (!group?.active) return false;

  return group.locationIds.includes(selectedLocationId);
}
