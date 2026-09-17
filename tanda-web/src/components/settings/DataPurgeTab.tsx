'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import {
  createEmptyPurgeResult,
  hasDateRangeFilter,
  type DataPurgeDateRange,
  type DataPurgeOptions,
  type DataPurgeResult,
} from '@/lib/admin/data-purge';
import {
  DATA_PURGE_CATEGORIES,
  formatPurgeBytes,
  formatPurgeDateLabel,
  formatPurgeSpan,
  type DataPurgeCategoryKey,
  type DataPurgeCategoryStats,
  type DataPurgeRecommendLevel,
  type DataPurgeStatsResult,
} from '@/lib/admin/data-purge-catalog';
import { auth } from '@/lib/firebase';

const CONFIRM_PHRASE = 'DELETE DATA';

const STORAGE_BAR_COLORS = [
  'bg-red-500',
  'bg-amber-500',
  'bg-orange-400',
  'bg-rose-400',
  'bg-yellow-500',
  'bg-fuchsia-500',
  'bg-sky-500',
] as const;

interface DataPurgeTabProps {
  adminEmail: string;
}

const DEFAULT_OPTIONS: DataPurgeOptions = {
  attendanceRecords: true,
  attendanceStorage: true,
  attendanceJustifications: false,
  shifts: false,
  leaveRequests: false,
  notifications: false,
  notificationPreferences: false,
  announcements: false,
  cargoInspections: false,
  cargoInspectionsStorage: false,
  portalClients: false,
  locations: false,
  locationGroups: false,
  kioskDevices: false,
  kioskLoginLogs: false,
  employeeDocumentsStorage: false,
  employeeCustomFieldValues: false,
  employeeCustomFields: false,
  issueReports: false,
  issueReportsStorage: false,
  helpTutorials: false,
  helpTutorialsStorage: false,
  accountingPeriodLocks: false,
  authSessions: false,
  auditLogs: false,
  courses: false,
  courseEnrollments: false,
  courseEvidenceStorage: false,
  orphanedAuthUsers: false,
  resetEmployeePresence: true,
  clearEmployeeDocumentRefs: false,
  clearEmployeeLocationRefs: false,
};

const OPTION_META: Record<
  DataPurgeCategoryKey,
  { label: string; hint: string }
> = {
  attendanceStorage: {
    label: 'Attendance photos (Storage)',
    hint: 'Frees the most space — kiosk/tablet check-in images under attendance/',
  },
  attendanceRecords: {
    label: 'Attendance records (Firestore)',
    hint: 'Check-in / check-out history',
  },
  attendanceJustifications: {
    label: 'Attendance justifications (Firestore)',
    hint: 'Late arrival notes and no-show explanations',
  },
  resetEmployeePresence: {
    label: 'Reset employee presence status',
    hint: 'Sets lastAction to none so kiosk state matches empty attendance',
  },
  shifts: {
    label: 'Scheduled shifts',
    hint: 'Roster / agenda entries',
  },
  leaveRequests: {
    label: 'Leave requests',
    hint: 'Pending, approved, and rejected requests',
  },
  notifications: {
    label: 'In-app notifications (Firestore)',
    hint: 'Employee tray items and admin alert dismiss state',
  },
  notificationPreferences: {
    label: 'Notification preferences (Firestore)',
    hint: 'Per-user channel toggles — date filter ignored (master data)',
  },
  announcements: {
    label: 'Announcements (Firestore)',
    hint: 'Broadcast messages sent to staff',
  },
  issueReportsStorage: {
    label: 'Issue report attachments (Storage)',
    hint: 'Photos under issue_reports/',
  },
  issueReports: {
    label: 'Issue reports (Firestore)',
    hint: 'Staff-reported problems and support tickets',
  },
  helpTutorialsStorage: {
    label: 'Help guide media (Storage)',
    hint: 'Videos, PDFs and docs under help_tutorials/',
  },
  helpTutorials: {
    label: 'Help guides (Firestore)',
    hint: 'In-app help centre records — date filter ignored',
  },
  courseEvidenceStorage: {
    label: 'Course evidence (Storage)',
    hint: 'Uploads under course_evidence/',
  },
  courseEnrollments: {
    label: 'Course enrollments (Firestore)',
    hint: 'Employee course progress and completions',
  },
  courses: {
    label: 'Courses catalog (Firestore)',
    hint: 'Course definitions — also selects enrollments + evidence',
  },
  employeeDocumentsStorage: {
    label: 'Employee identity documents (Storage)',
    hint: 'Passport, visa, and custom field uploads under employee_documents/',
  },
  clearEmployeeDocumentRefs: {
    label: 'Clear passport / visa URL fields on employees',
    hint: 'Removes broken links after document storage is wiped',
  },
  employeeCustomFieldValues: {
    label: 'Employee custom field values (Firestore)',
    hint: 'Per-employee answers for custom profile fields',
  },
  employeeCustomFields: {
    label: 'Employee custom field definitions (Firestore)',
    hint: 'Field schema — also selects values so answers are not orphaned',
  },
  accountingPeriodLocks: {
    label: 'Accounting period locks (Firestore)',
    hint: 'Closed pay-period locks used by payroll reporting',
  },
  authSessions: {
    label: 'Auth sessions (Firestore)',
    hint: 'Server session markers — users may need to sign in again',
  },
  orphanedAuthUsers: {
    label: 'Orphaned Firebase Auth users',
    hint: 'Deletes Auth accounts whose email is not on any employee (never deletes your account)',
  },
  kioskLoginLogs: {
    label: 'Kiosk login logs (Firestore)',
    hint: 'Tablet sign-in history',
  },
  kioskDevices: {
    label: 'Legacy kiosk_devices collection (orphaned)',
    hint: 'Old tablet approval records. Kiosk access is now on employee accounts.',
  },
  locationGroups: {
    label: 'Location groups (Firestore)',
    hint: 'Multi-site groupings — also clears group refs on employees',
  },
  locations: {
    label: 'Locations / warehouses (Firestore)',
    hint: 'Site master data + location_photos/ — also clears location refs on employees',
  },
  clearEmployeeLocationRefs: {
    label: 'Clear location / group fields on employees',
    hint: 'Removes locationId and locationGroupId when sites are wiped',
  },
  auditLogs: {
    label: 'Audit logs (Firestore)',
    hint: 'Master-only change history — combine with date filter for periodic cleanup',
  },
  portalClients: {
    label: 'Legacy portal_clients collection (orphaned)',
    hint: 'Registered forwarders / customs agencies with AWB + PIN access',
  },
  cargoInspectionsStorage: {
    label: 'Cargo inspection media (Storage)',
    hint: 'Photos and videos under cargo_inspections/',
  },
  cargoInspections: {
    label: 'Cargo inspections (Firestore)',
    hint: 'All ULD / AWB records from Continental Inspect',
  },
};

export function DataPurgeTab({ adminEmail }: DataPurgeTabProps) {
  const [options, setOptions] = useState<DataPurgeOptions>(DEFAULT_OPTIONS);
  const [dateRange, setDateRange] = useState<DataPurgeDateRange>({
    startDate: '',
    endDate: '',
  });
  const [confirmText, setConfirmText] = useState('');
  const [running, setRunning] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [result, setResult] = useState<DataPurgeResult | null>(null);
  const [stats, setStats] = useState<DataPurgeStatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const canRun = confirmText.trim() === CONFIRM_PHRASE && !running;
  const dateFilterOn = hasDateRangeFilter(dateRange);

  const loadStats = useCallback(async (range: DataPurgeDateRange) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('You must be signed in.');
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (range.startDate.trim()) params.set('startDate', range.startDate.trim());
      if (range.endDate.trim()) params.set('endDate', range.endDate.trim());
      const query = params.toString();
      const response = await fetch(
        `/api/admin/data-purge/stats${query ? `?${query}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await response.json()) as DataPurgeStatsResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Could not load data stats.');
      }
      setStats(data);
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Could not load data stats.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadStats(dateRange);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [dateRange, loadStats]);

  function toggleOption(key: keyof DataPurgeOptions) {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'attendanceRecords' && next.attendanceRecords) {
        next.resetEmployeePresence = true;
      }
      if (key === 'cargoInspections' && next.cargoInspections) {
        next.cargoInspectionsStorage = true;
        next.portalClients = true;
      }
      if (key === 'cargoInspectionsStorage' && !next.cargoInspectionsStorage) {
        next.cargoInspections = false;
        next.portalClients = false;
      }
      if (key === 'portalClients' && !next.portalClients && next.cargoInspections) {
        next.cargoInspections = false;
        next.cargoInspectionsStorage = false;
      }
      if (key === 'employeeDocumentsStorage' && next.employeeDocumentsStorage) {
        next.clearEmployeeDocumentRefs = true;
      }
      if (key === 'issueReports' && next.issueReports) {
        next.issueReportsStorage = true;
      }
      if (key === 'helpTutorials' && next.helpTutorials) {
        next.helpTutorialsStorage = true;
      }
      if ((key === 'locations' || key === 'locationGroups') && (next.locations || next.locationGroups)) {
        next.clearEmployeeLocationRefs = true;
      }
      if (key === 'employeeCustomFields' && next.employeeCustomFields) {
        next.employeeCustomFieldValues = true;
      }
      if (key === 'courses' && next.courses) {
        next.courseEnrollments = true;
        next.courseEvidenceStorage = true;
      }
      if (key === 'courseEnrollments' && next.courseEnrollments) {
        next.courseEvidenceStorage = true;
      }
      return next;
    });
  }

  async function handlePurge() {
    if (!canRun) return;

    setRunning(true);
    setResult(null);
    setProgressLog(['Starting cleanup…']);

    try {
      const user = auth?.currentUser;
      if (!user) {
        throw new Error('You must be signed in to run cleanup.');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/data-purge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ options, dateRange }),
      });

      const data = (await response.json()) as {
        result?: DataPurgeResult;
        progress?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Cleanup failed.');
      }

      if (data.progress?.length) {
        setProgressLog(['Starting cleanup…', ...data.progress]);
      }

      setResult(data.result ?? null);
      setConfirmText('');
      await loadStats(dateRange);
    } catch (error) {
      setResult({
        ...createEmptyPurgeResult(),
        errors: [error instanceof Error ? error.message : 'Cleanup failed.'],
      });
    } finally {
      setRunning(false);
    }
  }

  const storageSegments = useMemo(() => {
    if (!stats) return [];
    return DATA_PURGE_CATEGORIES.filter((def) => def.contributesToStorageBar)
      .map((def, index) => {
        const category = stats.categories[def.key];
        const bytes = category?.storageBytes ?? 0;
        return {
          key: def.key,
          label: def.label,
          bytes,
          color: STORAGE_BAR_COLORS[index % STORAGE_BAR_COLORS.length]!,
          recommendFree: category?.recommendFree ?? 'ok',
        };
      })
      .filter((item) => item.bytes > 0)
      .sort((a, b) => b.bytes - a.bytes);
  }, [stats]);

  const recommendedFree = useMemo(() => {
    if (!stats) return [];
    return DATA_PURGE_CATEGORIES.filter(
      (def) => stats.categories[def.key]?.recommendFree === 'free',
    ).map((def) => def.label);
  }, [stats]);

  return (
    <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5 md:p-6">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Data control & cleanup</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Inventory Storage weight and Firestore volume, then purge selected categories.
                Employee accounts, profile avatars, departments, access roles, and localization
                settings are kept. Deletes cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadStats(dateRange)}
              disabled={statsLoading || running}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong px-3 text-xs font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh stats
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface-base/50 p-4">
        {statsLoading && !stats ? (
          <p className="flex items-center gap-2 text-xs text-subtle">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Measuring storage and document volume…
          </p>
        ) : null}

        {statsError ? (
          <p className="text-xs text-red-400">{statsError}</p>
        ) : null}

        {stats ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {formatPurgeBytes(stats.totals.storageBytes)} in Storage
                <span className="mx-2 text-muted">·</span>
                <span className="text-subtle">
                  {stats.totals.docCount.toLocaleString()} documents
                </span>
                <span className="mx-2 text-muted">·</span>
                <span className="text-subtle">
                  {stats.totals.fileCount.toLocaleString()} files
                </span>
              </p>
              <p className="text-[11px] text-muted">
                Updated {new Date(stats.generatedAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex h-3 overflow-hidden rounded-full bg-surface-raised ring-1 ring-border">
              {storageSegments.length === 0 ? (
                <div className="h-full w-full bg-surface-hover/60" />
              ) : (
                storageSegments.map((segment) => (
                  <button
                    key={segment.key}
                    type="button"
                    title={`${segment.label}: ${formatPurgeBytes(segment.bytes)} — click to toggle`}
                    onClick={() => toggleOption(segment.key)}
                    className={`${segment.color} h-full transition hover:brightness-110`}
                    style={{
                      width: `${Math.max(
                        2,
                        (segment.bytes / Math.max(stats.totals.storageBytes, 1)) * 100,
                      )}%`,
                    }}
                  />
                ))
              )}
            </div>

            {storageSegments.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle">
                {storageSegments.map((segment) => (
                  <li key={segment.key} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-sm ${segment.color}`} />
                    {segment.label} ({formatPurgeBytes(segment.bytes)})
                    {segment.recommendFree === 'free' ? (
                      <span className="text-amber-400">· free</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-subtle">No Storage files in this scope.</p>
            )}

            {recommendedFree.length > 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Recommended to free: {recommendedFree.join(', ')}
              </p>
            ) : (
              <p className="text-[11px] text-subtle">
                No urgent Storage pressure — still safe to prune old operational docs with a date
                filter.
              </p>
            )}

            {stats.partialWarnings.length > 0 ? (
              <p className="text-[11px] text-amber-400/90">
                Partial inventory: {stats.partialWarnings.slice(0, 2).join(' · ')}
                {stats.partialWarnings.length > 2
                  ? ` (+${stats.partialWarnings.length - 2} more)`
                  : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface-base/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Date filter (optional)
        </p>
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          Leave empty to inventory / delete all selected data. When set, operational records and
          Storage files are limited to this range. Master data still deletes fully if selected.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">From</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              disabled={running}
              className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-red-500/50 disabled:opacity-50"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">To</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              disabled={running}
              className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-red-500/50 disabled:opacity-50"
            />
          </label>
        </div>
        {dateFilterOn ? (
          <p className="mt-2 text-xs text-amber-400/90">
            Filter active — presence reset is skipped; stats reflect the selected window.
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        {DATA_PURGE_CATEGORIES.map((def) => {
          const meta = OPTION_META[def.key];
          const categoryStats = stats?.categories[def.key];
          const disabled =
            (def.key === 'resetEmployeePresence' &&
              (!options.attendanceRecords || dateFilterOn)) ||
            false;

          return (
            <OptionRow
              key={def.key}
              checked={options[def.key]}
              onChange={() => toggleOption(def.key)}
              disabled={disabled}
              label={meta.label}
              hint={
                def.key === 'resetEmployeePresence' && dateFilterOn
                  ? 'Disabled while a date filter is set (presence is global)'
                  : meta.hint
              }
              stats={categoryStats}
              statsLoading={statsLoading}
            />
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface-base/50 p-4">
        <p className="text-xs text-subtle">
          Signed in as <span className="text-muted">{adminEmail}</span>. Type{' '}
          <span className="font-mono font-semibold text-red-300">{CONFIRM_PHRASE}</span>{' '}
          to enable the button.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={running}
          placeholder={CONFIRM_PHRASE}
          className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-red-500/50 disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {(progressLog.length > 0 || result) && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-base/80 p-3 font-mono text-[11px] leading-relaxed text-subtle">
          {progressLog.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
          {result ? <PurgeResultSummary result={result} /> : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handlePurge()}
        disabled={!canRun}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cleaning…
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Run selected cleanup
          </>
        )}
      </button>
    </section>
  );
}

function buildStatsLine(stats: DataPurgeCategoryStats): string | null {
  if (stats.kind === 'action') return null;

  const parts: string[] = [];

  if (typeof stats.storageBytes === 'number' && (stats.storageBytes > 0 || stats.kind === 'storage')) {
    parts.push(formatPurgeBytes(stats.storageBytes));
  }
  if (typeof stats.fileCount === 'number' && stats.fileCount > 0) {
    parts.push(`${stats.fileCount.toLocaleString()} file${stats.fileCount === 1 ? '' : 's'}`);
  }
  if (typeof stats.docCount === 'number') {
    parts.push(`${stats.docCount.toLocaleString()} doc${stats.docCount === 1 ? '' : 's'}`);
  }

  const span = formatPurgeSpan(stats.spanDays);
  if (span) {
    const from = formatPurgeDateLabel(stats.oldest);
    const to = formatPurgeDateLabel(stats.newest);
    parts.push(
      from && to ? `${span} (${from} – ${to})` : span,
    );
  }

  return parts.length > 0 ? parts.join(' · ') : 'Empty';
}

function RecommendBadge({ level }: { level: DataPurgeRecommendLevel }) {
  if (level === 'free') {
    return (
      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        Free
      </span>
    );
  }
  if (level === 'watch') {
    return (
      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
        Watch
      </span>
    );
  }
  return (
    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
      OK
    </span>
  );
}

function PurgeResultSummary({ result }: { result: DataPurgeResult }) {
  const lines: Array<[string, number]> = [
    ['Storage files removed', result.storageFilesDeleted],
    ['Attendance records removed', result.attendanceRecordsDeleted],
    ['Attendance justifications removed', result.attendanceJustificationsDeleted],
    ['Shifts removed', result.shiftsDeleted],
    ['Leave requests removed', result.leaveRequestsDeleted],
    ['Notifications removed', result.notificationsDeleted],
    ['Notification preferences removed', result.notificationPreferencesDeleted],
    ['Announcements removed', result.announcementsDeleted],
    ['Issue report attachments removed', result.issueReportsStorageDeleted],
    ['Issue reports removed', result.issueReportsDeleted],
    ['Help tutorial media removed', result.helpTutorialsStorageDeleted],
    ['Help tutorials removed', result.helpTutorialsDeleted],
    ['Course evidence removed', result.courseEvidenceStorageDeleted],
    ['Course enrollments removed', result.courseEnrollmentsDeleted],
    ['Courses removed', result.coursesDeleted],
    ['Employee documents removed', result.employeeDocumentsStorageDeleted],
    ['Employee document refs cleared', result.employeeDocumentRefsCleared],
    ['Custom field values removed', result.employeeCustomFieldValuesDeleted],
    ['Custom field definitions removed', result.employeeCustomFieldsDeleted],
    ['Accounting period locks removed', result.accountingPeriodLocksDeleted],
    ['Auth sessions removed', result.authSessionsDeleted],
    ['Orphaned Auth users removed', result.orphanedAuthUsersDeleted],
    ['Inspection media removed', result.cargoInspectionsStorageDeleted],
    ['Cargo inspections removed', result.cargoInspectionsDeleted],
    ['Legacy portal clients removed', result.portalClientsDeleted],
    ['Kiosk login logs removed', result.kioskLoginLogsDeleted],
    ['Legacy kiosk devices removed', result.kioskDevicesDeleted],
    ['Location groups removed', result.locationGroupsDeleted],
    ['Locations removed', result.locationsDeleted],
    ['Employee location refs cleared', result.employeeLocationRefsCleared],
    ['Audit logs removed', result.auditLogsDeleted],
    ['Employees reset', result.employeesReset],
  ];

  return (
    <div className="mt-2 border-t border-border pt-2 text-muted">
      {lines.map(([label, count]) =>
        count > 0 ? (
          <p key={label}>
            {label}: {count}
          </p>
        ) : null,
      )}
      {result.errors.map((error) => (
        <p key={error} className="text-red-400">
          Error: {error}
        </p>
      ))}
    </div>
  );
}

function OptionRow({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
  stats,
  statsLoading,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  hint: string;
  stats?: DataPurgeCategoryStats;
  statsLoading?: boolean;
}) {
  const statsLine = stats ? buildStatsLine(stats) : null;

  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border border-border/80 bg-surface-base/40 px-3 py-2.5 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-border-strong'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-surface-raised text-primary focus:ring-primary/40"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {stats && stats.kind !== 'action' ? (
            <RecommendBadge level={stats.recommendFree} />
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-subtle">{hint}</span>
        {statsLoading && !stats ? (
          <span className="mt-1 block text-[11px] text-muted">Measuring…</span>
        ) : null}
        {statsLine ? (
          <span className="mt-1 block text-[11px] text-muted">{statsLine}</span>
        ) : null}
      </span>
    </label>
  );
}
