import type { AttendanceType } from '@/lib/types/attendance';

const STORAGE_KEY = 'tanda.kiosk.localPunchHistory.v1';
const MAX_RECORDS = 100;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface LocalKioskPunchHistoryEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  actionType: AttendanceType;
  locationId: string;
  locationName: string;
  createdAt: string;
}

function isAttendanceType(value: unknown): value is AttendanceType {
  return (
    value === 'check_in' ||
    value === 'check_out' ||
    value === 'break_start' ||
    value === 'break_end'
  );
}

function parseEntries(raw: unknown): LocalKioskPunchHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.employeeId !== 'string' ||
      typeof row.employeeName !== 'string' ||
      typeof row.locationId !== 'string' ||
      typeof row.locationName !== 'string' ||
      typeof row.createdAt !== 'string' ||
      !isAttendanceType(row.actionType)
    ) {
      return [];
    }

    return [
      {
        id: row.id,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        actionType: row.actionType,
        locationId: row.locationId,
        locationName: row.locationName,
        createdAt: row.createdAt,
      },
    ];
  });
}

function pruneEntries(
  entries: LocalKioskPunchHistoryEntry[],
  now = Date.now(),
): LocalKioskPunchHistoryEntry[] {
  const cutoff = now - MAX_AGE_MS;
  return entries
    .filter((entry) => {
      const time = Date.parse(entry.createdAt);
      return Number.isFinite(time) && time >= cutoff;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_RECORDS);
}

function readRaw(): LocalKioskPunchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseEntries(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeRaw(entries: LocalKioskPunchHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruneEntries(entries)));
  } catch {
    // Quota / private mode — ignore.
  }
}

/** Returns this device's recent punch history (max 7 days / 100 rows). */
export function listLocalKioskPunchHistory(): LocalKioskPunchHistoryEntry[] {
  const pruned = pruneEntries(readRaw());
  writeRaw(pruned);
  return pruned;
}

export function recordLocalKioskPunch(input: {
  employeeId: string;
  employeeName: string;
  actionType: AttendanceType;
  locationId: string;
  locationName: string;
  createdAt?: Date;
}): LocalKioskPunchHistoryEntry {
  const entry: LocalKioskPunchHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: input.employeeId.trim(),
    employeeName: input.employeeName.trim() || 'Employee',
    actionType: input.actionType,
    locationId: input.locationId.trim(),
    locationName: input.locationName.trim() || 'Client',
    createdAt: (input.createdAt ?? new Date()).toISOString(),
  };

  const next = pruneEntries([entry, ...readRaw()]);
  writeRaw(next);
  return entry;
}
