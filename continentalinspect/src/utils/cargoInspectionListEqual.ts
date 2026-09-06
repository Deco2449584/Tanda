import type { CargoInspection } from '@/types';

function inspectionFingerprint(inspection: CargoInspection): string {
  return [
    inspection.id,
    inspection.updatedAt ?? inspection.registeredAt,
    inspection.status,
    inspection.unitType,
    inspection.dispatchedAt ?? '',
    inspection.hasIssues,
    inspection.syncStatus,
    inspection.uldId,
  ].join(':');
}

/** Cheap equality check to skip React updates when Firestore snapshot is unchanged. */
export function areCargoInspectionListsEqual(
  previous: readonly CargoInspection[],
  next: readonly CargoInspection[],
): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    if (inspectionFingerprint(previous[index]) !== inspectionFingerprint(next[index])) {
      return false;
    }
  }

  return true;
}
