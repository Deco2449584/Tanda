'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AttendanceRestrictionError,
  createAttendanceRecordRequest,
} from '@/lib/attendance/attendance-records-api';
import { formValuesToTimestamp } from '@/lib/attendance/format';
import { isWorkforceEmployee } from '@/lib/employees/is-workforce-employee';
import { captureCurrentPosition } from '@/lib/geo/capture-position';
import type { AttendanceRecord, AttendanceType } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

interface AddManualAttendanceFormProps {
  employees: Employee[];
  locations: Location[];
  allRecords: AttendanceRecord[];
  onCancel: () => void;
  onSuccess: () => void;
}

const WEEKDAY_OPTIONS = [
  { jsDay: 1, label: 'Mon' },
  { jsDay: 2, label: 'Tue' },
  { jsDay: 3, label: 'Wed' },
  { jsDay: 4, label: 'Thu' },
  { jsDay: 5, label: 'Fri' },
  { jsDay: 6, label: 'Sat' },
  { jsDay: 0, label: 'Sun' },
] as const;

interface DayTimes {
  checkIn: string;
  breakStart: string;
  breakEnd: string;
  checkOut: string;
}

const DEFAULT_TIMES: DayTimes = {
  checkIn: '09:00',
  breakStart: '12:00',
  breakEnd: '12:30',
  checkOut: '17:00',
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mondayOfWeek(anchorIso: string): string {
  const date = new Date(`${anchorIso}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

function datesForSelectedWeekdays(
  weekMondayIso: string,
  selectedJsDays: Set<number>,
): string[] {
  const monday = new Date(`${weekMondayIso}T12:00:00`);
  const dates: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + offset);
    if (selectedJsDays.has(day.getDay())) {
      dates.push(toDateKey(day));
    }
  }
  return dates;
}

const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function formatDayCard(dateKey: string): {
  weekday: string;
  weekdayShort: string;
  dateLabel: string;
} {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = WEEKDAY_LONG[date.getDay()] ?? '';
  const weekdayShort = weekday.slice(0, 3);
  const dateLabel = `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  return { weekday, weekdayShort, dateLabel };
}

export function AddManualAttendanceForm({
  employees,
  locations,
  allRecords,
  onCancel,
  onSuccess,
}: AddManualAttendanceFormProps) {
  const [employeeDocId, setEmployeeDocId] = useState('');
  const [locationId, setLocationId] = useState('');

  const [includeCheckIn, setIncludeCheckIn] = useState(true);
  const [includeBreakStart, setIncludeBreakStart] = useState(false);
  const [includeBreakEnd, setIncludeBreakEnd] = useState(false);
  const [includeCheckOut, setIncludeCheckOut] = useState(true);

  const [weekAnchor, setWeekAnchor] = useState(() => toDateKey(new Date()));
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(
    () => new Set([new Date().getDay()]),
  );
  const [sameHours, setSameHours] = useState(true);
  const [sharedTimes, setSharedTimes] = useState<DayTimes>(DEFAULT_TIMES);
  const [perDayTimes, setPerDayTimes] = useState<Record<string, DayTimes>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeEmployees = employees.filter((employee) =>
    isWorkforceEmployee(employee),
  );
  const activeLocations = locations.filter((location) => location.active);

  const weekMonday = useMemo(
    () => (weekAnchor ? mondayOfWeek(weekAnchor) : ''),
    [weekAnchor],
  );

  const anchorWeekday = useMemo(
    () =>
      weekAnchor
        ? new Date(`${weekAnchor}T12:00:00`).getDay()
        : new Date().getDay(),
    [weekAnchor],
  );

  const selectedDates = useMemo(
    () =>
      weekMonday
        ? datesForSelectedWeekdays(weekMonday, selectedWeekdays)
        : [],
    [weekMonday, selectedWeekdays],
  );

  useEffect(() => {
    setSelectedWeekdays((prev) => {
      if (prev.size === 1 && prev.has(anchorWeekday)) return prev;
      return new Set([anchorWeekday]);
    });
  }, [anchorWeekday]);

  useEffect(() => {
    if (!sameHours) {
      setPerDayTimes((prev) => {
        const next = { ...prev };
        for (const dateKey of selectedDates) {
          if (!next[dateKey]) next[dateKey] = { ...sharedTimes };
        }
        return next;
      });
    }
  }, [sameHours, selectedDates, sharedTimes]);

  function toggleWeekday(jsDay: number) {
    setSelectedWeekdays((prev) => {
      // The date picker's weekday must stay selected.
      if (jsDay === anchorWeekday) return prev;

      const next = new Set(prev);
      if (next.has(jsDay)) {
        next.delete(jsDay);
        if (next.size === 0) next.add(anchorWeekday);
      } else {
        next.add(jsDay);
      }
      if (!next.has(anchorWeekday)) next.add(anchorWeekday);
      return next;
    });
  }

  function timesForDate(dateKey: string): DayTimes {
    if (sameHours) return sharedTimes;
    return perDayTimes[dateKey] ?? sharedTimes;
  }

  function buildPunchesForDay(
    dateKey: string,
  ): Array<{ type: AttendanceType; timestampMs: number }> {
    const times = timesForDate(dateKey);
    const punches: Array<{ type: AttendanceType; timestampMs: number }> = [];

    if (includeCheckIn) {
      punches.push({
        type: 'check_in',
        timestampMs: formValuesToTimestamp(dateKey, times.checkIn).toMillis(),
      });
    }
    if (includeBreakStart) {
      punches.push({
        type: 'break_start',
        timestampMs: formValuesToTimestamp(dateKey, times.breakStart).toMillis(),
      });
    }
    if (includeBreakEnd) {
      punches.push({
        type: 'break_end',
        timestampMs: formValuesToTimestamp(dateKey, times.breakEnd).toMillis(),
      });
    }
    if (includeCheckOut) {
      punches.push({
        type: 'check_out',
        timestampMs: formValuesToTimestamp(dateKey, times.checkOut).toMillis(),
      });
    }

    punches.sort((a, b) => a.timestampMs - b.timestampMs);
    return punches;
  }

  function validateBeforeSave(): string | null {
    if (!employeeDocId) return 'Select an employee.';
    if (!locationId) return 'Select a client.';
    if (selectedDates.length === 0) {
      return 'Select at least one weekday for the chosen week.';
    }

    if (
      !includeCheckIn &&
      !includeBreakStart &&
      !includeBreakEnd &&
      !includeCheckOut
    ) {
      return 'Enable at least one punch (check-in, break, or check-out).';
    }

    for (const dateKey of selectedDates) {
      const punches = buildPunchesForDay(dateKey);
      if (punches.length === 0) {
        return `No punches configured for ${dateKey}.`;
      }
      for (let i = 1; i < punches.length; i += 1) {
        if (punches[i]!.timestampMs <= punches[i - 1]!.timestampMs) {
          return `Times on ${dateKey} must be in chronological order.`;
        }
      }
    }

    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const validationError = validateBeforeSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    const employee = activeEmployees.find((item) => item.id === employeeDocId);
    if (!employee) {
      setError('Select an employee.');
      return;
    }

    setSaving(true);

    try {
      const selectedLocation = activeLocations.find((item) => item.id === locationId);
      if (!selectedLocation) {
        setError('Select a client.');
        setSaving(false);
        return;
      }
      const geo = await captureCurrentPosition();

      const employeeRecords = allRecords.filter(
        (item) => item.employeeId === employee.employeeId,
      );
      let latestMs = Math.max(
        ...employeeRecords.map((item) => item.timestampServer?.toMillis() ?? 0),
        0,
      );

      const allPunches = selectedDates.flatMap((dateKey) =>
        buildPunchesForDay(dateKey),
      );
      allPunches.sort((a, b) => a.timestampMs - b.timestampMs);

      for (const punch of allPunches) {
        await createWithOverride({
          employeeDocId: employee.id,
          type: punch.type,
          timestampMs: punch.timestampMs,
          source: 'web-admin-manual',
          locationId: selectedLocation.id,
          locationNameSnapshot: selectedLocation.name,
          locationCitySnapshot: selectedLocation.city ?? null,
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          geoAccuracy: geo?.accuracy,
          breakWaived: punch.type === 'check_out' ? false : undefined,
          syncEmployeePresence: punch.timestampMs >= latestMs,
          overrideRestrictions: false,
        });

        if (punch.timestampMs >= latestMs) latestMs = punch.timestampMs;
      }

      onSuccess();
    } catch (submitError) {
      console.error('Manual record failed:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not save the record.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function createWithOverride(
    payload: Record<string, unknown> & {
      type: AttendanceType;
      overrideRestrictions: boolean;
    },
  ): Promise<void> {
    try {
      await createAttendanceRecordRequest(payload);
    } catch (error) {
      if (
        !payload.overrideRestrictions &&
        payload.type === 'check_in' &&
        error instanceof AttendanceRestrictionError
      ) {
        const confirmed = window.confirm(
          `${error.message}\n\nSave this manual check-in anyway? This override will be logged.`,
        );
        if (confirmed) {
          await createAttendanceRecordRequest({
            ...payload,
            overrideRestrictions: true,
          });
          return;
        }
      }
      throw error;
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-foreground">Who & where</h2>
          <p className="mt-1 text-xs text-muted">
            Choose the employee and client for these punches.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="manual-employee" className="mb-1.5 block text-sm text-muted">
              Employee
            </label>
            <select
              id="manual-employee"
              required
              value={employeeDocId}
              onChange={(e) => setEmployeeDocId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select employee…</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual-location" className="mb-1.5 block text-sm text-muted">
              Client
            </label>
            <select
              id="manual-location"
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select client…</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.city ? `${location.name} (${location.city})` : location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-foreground">Days this week</h2>
          <p className="mt-1 text-xs text-muted">
            Pick a date to lock that weekday; tap others to include more days.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,16rem)_1fr]">
          <div>
            <label htmlFor="manual-week" className="mb-1.5 block text-sm text-muted">
              Week of
            </label>
            <input
              id="manual-week"
              type="date"
              value={weekAnchor}
              onChange={(e) => setWeekAnchor(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm text-muted">Weekdays</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const active = selectedWeekdays.has(day.jsDay);
                const locked = day.jsDay === anchorWeekday;
                return (
                  <button
                    key={day.label}
                    type="button"
                    onClick={() => toggleWeekday(day.jsDay)}
                    title={
                      locked
                        ? 'Required for the selected date'
                        : active
                          ? 'Remove this day'
                          : 'Add this day'
                    }
                    aria-pressed={active}
                    className={`min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? locked
                          ? 'cursor-default border-primary bg-primary text-white'
                          : 'border-primary bg-primary/20 text-primary'
                        : 'border-border-strong text-muted hover:text-foreground'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-subtle">
              {selectedDates.length === 0
                ? 'No days selected.'
                : `Will create on: ${selectedDates
                    .map((dateKey) => {
                      const { weekdayShort, dateLabel } = formatDayCard(dateKey);
                      return `${weekdayShort} ${dateLabel}`;
                    })
                    .join(' · ')}`}
            </p>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={sameHours}
            onChange={(e) => setSameHours(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600"
          />
          Same hours for all selected days
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-foreground">Session punches</h2>
          <p className="mt-1 text-xs text-muted">
            Enable only the punches you need — a single check-in or check-out works fine.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <PunchToggle
              checked={includeCheckIn}
              onChange={setIncludeCheckIn}
              label="Check-in"
              time={sharedTimes.checkIn}
              onTimeChange={(value) =>
                setSharedTimes((prev) => ({ ...prev, checkIn: value }))
              }
              showSharedTime={sameHours}
            />
            <PunchToggle
              checked={includeBreakStart}
              onChange={setIncludeBreakStart}
              label="Break start"
              time={sharedTimes.breakStart}
              onTimeChange={(value) =>
                setSharedTimes((prev) => ({ ...prev, breakStart: value }))
              }
              showSharedTime={sameHours}
            />
            <PunchToggle
              checked={includeBreakEnd}
              onChange={setIncludeBreakEnd}
              label="Break end"
              time={sharedTimes.breakEnd}
              onTimeChange={(value) =>
                setSharedTimes((prev) => ({ ...prev, breakEnd: value }))
              }
              showSharedTime={sameHours}
            />
            <PunchToggle
              checked={includeCheckOut}
              onChange={setIncludeCheckOut}
              label="Check-out"
              time={sharedTimes.checkOut}
              onTimeChange={(value) =>
                setSharedTimes((prev) => ({ ...prev, checkOut: value }))
              }
              showSharedTime={sameHours}
            />
          </div>

          {!sameHours ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {selectedDates.map((dateKey) => {
                const { weekday, dateLabel } = formatDayCard(dateKey);
                return (
                  <div
                    key={dateKey}
                    className="overflow-hidden rounded-xl border border-border bg-surface-base/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-primary/10 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {weekday}
                        </p>
                        <p className="text-xs text-muted">{dateLabel}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {weekday.slice(0, 3)}
                      </span>
                    </div>

                    <div className="space-y-2.5 p-4">
                      {includeCheckIn ? (
                        <DayTimeRow
                          label="Check-in"
                          value={timesForDate(dateKey).checkIn}
                          onChange={(value) =>
                            setPerDayTimes((prev) => ({
                              ...prev,
                              [dateKey]: {
                                ...(prev[dateKey] ?? sharedTimes),
                                checkIn: value,
                              },
                            }))
                          }
                        />
                      ) : null}
                      {includeBreakStart ? (
                        <DayTimeRow
                          label="Break start"
                          value={timesForDate(dateKey).breakStart}
                          onChange={(value) =>
                            setPerDayTimes((prev) => ({
                              ...prev,
                              [dateKey]: {
                                ...(prev[dateKey] ?? sharedTimes),
                                breakStart: value,
                              },
                            }))
                          }
                        />
                      ) : null}
                      {includeBreakEnd ? (
                        <DayTimeRow
                          label="Break end"
                          value={timesForDate(dateKey).breakEnd}
                          onChange={(value) =>
                            setPerDayTimes((prev) => ({
                              ...prev,
                              [dateKey]: {
                                ...(prev[dateKey] ?? sharedTimes),
                                breakEnd: value,
                              },
                            }))
                          }
                        />
                      ) : null}
                      {includeCheckOut ? (
                        <DayTimeRow
                          label="Check-out"
                          value={timesForDate(dateKey).checkOut}
                          onChange={(value) =>
                            setPerDayTimes((prev) => ({
                              ...prev,
                              [dateKey]: {
                                ...(prev[dateKey] ?? sharedTimes),
                                checkOut: value,
                              },
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex h-10 min-w-[7rem] items-center justify-center rounded-lg border border-border-strong px-4 text-sm text-muted hover:bg-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 min-w-[9rem] items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-70"
        >
          {saving
            ? 'Saving…'
            : `Save${selectedDates.length > 1 ? ` (${selectedDates.length} days)` : ''}`}
        </button>
      </div>
    </form>
  );
}

function PunchToggle({
  checked,
  onChange,
  label,
  time,
  onTimeChange,
  showSharedTime,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  time: string;
  onTimeChange: (value: string) => void;
  showSharedTime: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-base/40 px-4 py-3">
      <label className="flex min-w-[7.5rem] items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600"
        />
        {label}
      </label>
      {checked && showSharedTime ? (
        <input
          type="time"
          required
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      ) : null}
    </div>
  );
}

function DayTimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface-raised/60 px-3 py-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type="time"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-strong bg-surface-base px-2.5 py-1.5 text-sm tabular-nums text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}
