import type { Shift } from '@/lib/types/shift';

export function formatShiftLocationLabel(shift: Shift): string {
  if (shift.locationNameSnapshot?.trim()) {
    const name = shift.locationNameSnapshot.trim();
    const city = shift.locationCitySnapshot?.trim();
    return city ? `${name} (${city})` : name;
  }
  return '';
}
