'use client';

import { Eye } from 'lucide-react';
import type { AuditLog } from '@/lib/types/audit-log';

function formatTimestamp(value: number): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEntityLabel(log: AuditLog): string {
  if (log.entityId) {
    const shortId =
      log.entityId.length > 14 ? `${log.entityId.slice(0, 12)}…` : log.entityId;
    return `${log.entityType} · ${shortId}`;
  }
  return log.entityType;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
  onViewDetails: (log: AuditLog) => void;
}

export function AuditLogsTable({ logs, onViewDetails }: AuditLogsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="hidden overflow-x-auto scrollbar-modern md:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3 font-semibold text-white">When</th>
              <th className="px-4 py-3 font-semibold text-white">Action</th>
              <th className="px-4 py-3 font-semibold text-white">Summary</th>
              <th className="px-4 py-3 font-semibold text-white">Actor</th>
              <th className="px-4 py-3 font-semibold text-white">Entity</th>
              <th className="px-4 py-3 font-semibold text-white">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr
                key={log.id}
                className={`border-b border-border/80 transition-colors hover:bg-surface-hover/20 ${
                  index % 2 === 1 ? 'bg-surface-base/40' : ''
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                  {formatTimestamp(log.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {log.action}
                  </span>
                </td>
                <td className="max-w-[18rem] px-4 py-3 text-foreground">
                  <span className="line-clamp-2">{log.summary}</span>
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3 text-muted">
                  {log.actorEmail}
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-xs text-subtle">
                  {formatEntityLabel(log)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onViewDetails(log)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/80 md:hidden">
        {logs.map((log) => (
          <li key={log.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {log.summary}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  {formatTimestamp(log.createdAt)} · {log.actorEmail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {log.action}
                  </span>
                  <span className="text-[11px] text-muted">{formatEntityLabel(log)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onViewDetails(log)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-strong px-2 py-1.5 text-[11px] font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Details
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-subtle">
        <span>
          Showing {logs.length} event{logs.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
