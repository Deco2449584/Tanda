import type { LocationGroup, LocationGroupFirestore } from '@/lib/types/location-group';

export function mapLocationGroupDoc(
  id: string,
  data: Record<string, unknown>,
): LocationGroup {
  const group = data as Partial<LocationGroupFirestore>;
  const locationIds = Array.isArray(group.locationIds)
    ? group.locationIds.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    id,
    name: typeof group.name === 'string' ? group.name.trim() : '',
    locationIds,
    active: group.active !== false,
    createdAt:
      group.createdAt && typeof group.createdAt === 'object' && 'toDate' in group.createdAt
        ? (group.createdAt as { toDate: () => Date }).toDate().toISOString()
        : undefined,
  };
}
