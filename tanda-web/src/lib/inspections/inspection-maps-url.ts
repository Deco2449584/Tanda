import type { CargoInspection } from '@/lib/types/cargo-inspection';

/** Prefer stored Maps URL; never expose raw coordinates in UI. */
export function resolveInspectionMapsUrl(
  inspection: Pick<
    CargoInspection,
    'registeredMapsUrl' | 'registeredLatitude' | 'registeredLongitude'
  >,
): string | null {
  const stored = inspection.registeredMapsUrl?.trim();
  if (stored) return stored;

  const { registeredLatitude: lat, registeredLongitude: lng } = inspection;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }

  return null;
}
