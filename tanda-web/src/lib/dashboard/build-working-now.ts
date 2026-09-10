import { formatWarehouseLabel } from '@/lib/attendance/location-display';
import { resolveAttendanceState } from '@/lib/attendance/resolve-attendance-action';
import { getLocationLabel } from '@/lib/locations/format-location';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

export type WorkingNowStatus = 'working' | 'on_break';

export interface WorkingNowPerson {
  employeeId: string;
  name: string;
  photoUrl?: string;
  department: string;
  status: WorkingNowStatus;
  locationId?: string;
  locationLabel: string;
  checkedInAt: Date;
  checkedInMs: number;
}

export interface WorkingNowSiteGroup {
  locationKey: string;
  locationLabel: string;
  locationId?: string;
  people: WorkingNowPerson[];
}

function recordTimestampMs(record: AttendanceRecord): number {
  return record.timestampServer?.toMillis() ?? 0;
}

function findOpenCheckIn(
  records: AttendanceRecord[],
): AttendanceRecord | null {
  const sorted = [...records].sort(
    (a, b) => recordTimestampMs(a) - recordTimestampMs(b),
  );

  let pending: AttendanceRecord | null = null;
  for (const record of sorted) {
    if (record.type === 'check_in') {
      pending = record;
      continue;
    }
    if (record.type === 'check_out') {
      pending = null;
    }
  }

  return pending;
}

function resolveLocationLabel(
  checkIn: AttendanceRecord,
  locations: readonly Location[],
): string {
  const fromSnapshot = formatWarehouseLabel(checkIn);
  if (fromSnapshot !== '—') return fromSnapshot;

  if (checkIn.locationId) {
    const label = getLocationLabel(checkIn.locationId, locations);
    if (label !== '—') return label;
  }

  return 'Unknown site';
}

export function buildWorkingNowPeople(input: {
  records: AttendanceRecord[];
  employees: readonly Employee[];
  timeZone: string;
  locationFilter?: string;
  locations: readonly Location[];
}): WorkingNowPerson[] {
  const employeesByCode = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  );

  const byEmployee = new Map<string, AttendanceRecord[]>();
  for (const record of input.records) {
    const employeeId = record.employeeId.trim();
    if (!employeeId) continue;
    const list = byEmployee.get(employeeId) ?? [];
    list.push(record);
    byEmployee.set(employeeId, list);
  }

  const people: WorkingNowPerson[] = [];
  const locationFilter =
    input.locationFilter && input.locationFilter !== 'all'
      ? input.locationFilter
      : null;

  byEmployee.forEach((employeeRecords, employeeId) => {
    const state = resolveAttendanceState({
      records: employeeRecords
        .map((record) => ({
          type: record.type,
          timestampMs: recordTimestampMs(record),
        }))
        .filter((record) => record.timestampMs > 0),
      timeZone: input.timeZone,
    });

    if (state === 'off_duty') return;

    const checkIn = findOpenCheckIn(employeeRecords);
    if (!checkIn?.timestampServer) return;

    if (locationFilter && checkIn.locationId !== locationFilter) {
      return;
    }

    const employee = employeesByCode.get(employeeId);
    if (employee && employee.active === false) return;

    const checkedInMs = checkIn.timestampServer.toMillis();
    const locationLabel = resolveLocationLabel(checkIn, input.locations);

    people.push({
      employeeId,
      name:
        employee?.name?.trim() ||
        checkIn.employeeNameSnapshot?.trim() ||
        employeeId,
      photoUrl: employee?.photoUrl,
      department: employee?.department?.trim() || '',
      status: state,
      locationId: checkIn.locationId,
      locationLabel,
      checkedInAt: checkIn.timestampServer.toDate(),
      checkedInMs,
    });
  });

  people.sort((a, b) => {
    const siteCompare = a.locationLabel.localeCompare(b.locationLabel);
    if (siteCompare !== 0) return siteCompare;
    if (a.status !== b.status) {
      return a.status === 'working' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return people;
}

export function groupWorkingNowBySite(
  people: WorkingNowPerson[],
): WorkingNowSiteGroup[] {
  const groups = new Map<string, WorkingNowSiteGroup>();

  for (const person of people) {
    const locationKey = person.locationId?.trim() || person.locationLabel;
    const existing = groups.get(locationKey);
    if (existing) {
      existing.people.push(person);
      continue;
    }

    groups.set(locationKey, {
      locationKey,
      locationLabel: person.locationLabel,
      locationId: person.locationId,
      people: [person],
    });
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.locationLabel.localeCompare(b.locationLabel),
  );
}

export function formatWorkingElapsed(checkedInMs: number, nowMs: number): string {
  const totalMinutes = Math.max(0, Math.floor((nowMs - checkedInMs) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatWorkingSince(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
