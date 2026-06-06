import { Timestamp } from 'firebase/firestore';
import { normalizeConservationType } from '@/lib/inspections/normalize-conservation';
import { normalizeInspectionStatus } from '@/lib/inspections/status';
import type {
  CargoInspection,
  CargoInspectionFirestore,
} from '@/lib/types/cargo-inspection';

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

function toDisplayIso(primary: unknown, fallbackIso?: string): string {
  const fromPrimary = timestampToIso(primary);
  if (fromPrimary) return fromPrimary;
  if (fallbackIso) return fallbackIso;
  return new Date(0).toISOString();
}

export function mapInspectionDoc(
  id: string,
  data: Record<string, unknown>,
): CargoInspection {
  const record = data as Partial<CargoInspectionFirestore>;
  const issueDescription = record.issueDescription?.trim();

  return {
    id,
    userId: record.userId ?? '',
    uldId: record.uldId ?? '',
    awbNumber: record.awbNumber ?? '',
    conservationType: normalizeConservationType(
      record.conservationType as string | undefined,
    ),
    foodType: record.foodType ?? '',
    weightKg: record.weightKg ?? 0,
    boxCount: record.boxCount ?? 0,
    hasIssues: Boolean(record.hasIssues),
    status: normalizeInspectionStatus(record.status),
    issueDescription: issueDescription || undefined,
    photoEvidence: Array.isArray(record.photoEvidence) ? record.photoEvidence : [],
    videoEvidence: Array.isArray(record.videoEvidence) ? record.videoEvidence : [],
    registeredAt: toDisplayIso(record.registeredAt, record.registeredAtIso),
    updatedAt: timestampToIso(record.updatedAt) ?? record.updatedAtIso,
    createdBy: record.createdBy ?? '',
  };
}
