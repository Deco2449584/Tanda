'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Download, ScrollText } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  downloadAuditLogsCsv,
  fetchAuditLogs,
} from '@/lib/audit/audit-logs-client';
import { getCurrentMonthRange } from '@/lib/attendance/date-range';
import { toInputDate } from '@/lib/dates/input-date';
import type { AuditEntityType, AuditLog } from '@/lib/types/audit-log';

const ACTION_PREFIX_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'employee', label: 'Employees' },
  { value: 'settings', label: 'Settings' },
  { value: 'role', label: 'Roles & permissions' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'system', label: 'System' },
];

const ENTITY_TYPE_OPTIONS: { value: '' | AuditEntityType; label: string }[] = [
  { value: '', label: 'All entities' },
  { value: 'attendance_record', label: 'Attendance records' },
  { value: 'employee', label: 'Employees' },
  { value: 'settings', label: 'Settings' },
  { value: 'admin_role', label: 'Access roles' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'system', label: 'System' },
];

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleString();
}

function JsonBlock({ value }: { value: Record<string, unknown> | null | undefined }) {
  if (!value) {
    return <p className="text-xs text-subtle">—</p>;
  }

  return (
    <pre className="max-h-48 overflow-auto rounded-lg border border-border/80 bg-surface-base/80 p-3 text-[11px] leading-relaxed text-muted">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AuditLogsTab() {
  const monthRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(toInputDate());
  const [actionPrefix, setActionPrefix] = useState('');
  const [entityType, setEntityType] = useState<'' | AuditEntityType>('');
  const [actorEmail, setActorEmail] = useState('');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchAuditLogs({
        startDate,
        endDate,
        actionPrefix: actionPrefix || undefined,
        entityType: entityType || undefined,
        actorEmail: actorEmail || undefined,
        search: search || undefined,
        limit: 250,
      });
      setLogs(items);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load audit logs.',
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionPrefix, actorEmail, endDate, entityType, search, startDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  async function handleExport() {
    setExporting(true);
    setError(null);

    try {
      await downloadAuditLogsCsv({
        startDate,
        endDate,
        actionPrefix: actionPrefix || undefined,
        entityType: entityType || undefined,
        actorEmail: actorEmail || undefined,
        search: search || undefined,
        limit: 500,
      });
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : 'Could not export audit logs.',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-primary/15 p-2 text-primary">
                <ScrollText className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-white">Audit logs</h2>
            </div>
            <p className="mt-2 text-sm text-subtle">
              Master-only trail of sensitive changes across attendance, employees,
              settings, roles, announcements, and system cleanup.
            </p>
          </div>

          <button
            type="button"
            disabled={exporting || loading}
            onClick={() => void handleExport()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 text-sm font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <FilterField label="From">
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label="To">
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label="Actor email">
          <input
            type="search"
            value={actorEmail}
            onChange={(event) => setActorEmail(event.target.value)}
            placeholder="admin@company.com"
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label="Action group">
          <div className="relative">
            <select
              value={actionPrefix}
              onChange={(event) => setActionPrefix(event.target.value)}
              className={`${filterInputClass} appearance-none pr-9`}
            >
              {ACTION_PREFIX_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </FilterField>
        <FilterField label="Entity type">
          <div className="relative">
            <select
              value={entityType}
              onChange={(event) =>
                setEntityType(event.target.value as '' | AuditEntityType)
              }
              className={`${filterInputClass} appearance-none pr-9`}
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </FilterField>
        <FilterField label="Search">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Summary, action, entity…"
            className={filterInputClass}
          />
        </FilterField>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingIndicator message="Loading audit logs…" className="h-48" />
      ) : logs.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface-raised px-4 py-10 text-center text-sm text-subtle">
          No audit events match these filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => {
            const expanded = expandedId === log.id;

            return (
              <li
                key={log.id}
                className="overflow-hidden rounded-xl border border-border bg-surface-raised"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : log.id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-surface-hover/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{log.summary}</span>
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {log.action}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-subtle">
                      {formatTimestamp(log.createdAt)} · {log.actorEmail}
                      {log.entityId ? ` · ${log.entityType} / ${log.entityId}` : ` · ${log.entityType}`}
                    </p>
                  </div>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-muted transition ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expanded ? (
                  <div className="grid gap-4 border-t border-border px-4 py-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Before
                      </p>
                      <JsonBlock value={log.before} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        After
                      </p>
                      <JsonBlock value={log.after} />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const filterInputClass =
  'w-full rounded-xl border border-border-strong/80 bg-surface-base/90 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20';

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
