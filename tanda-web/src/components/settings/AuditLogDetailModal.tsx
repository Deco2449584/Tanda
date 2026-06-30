'use client';

import { X } from 'lucide-react';
import type { AuditLog } from '@/lib/types/audit-log';

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleString();
}

function JsonBlock({ value }: { value: Record<string, unknown> | null | undefined }) {
  if (!value) {
    return <p className="text-xs text-subtle">—</p>;
  }

  return (
    <pre className="max-h-56 overflow-auto rounded-lg border border-border/80 bg-surface-base/80 p-3 text-[11px] leading-relaxed text-muted">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

export function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close audit log details"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-raised p-5 shadow-2xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Audit event details</h2>
            <p className="mt-1 text-sm text-muted">{formatTimestamp(log.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
              Summary
            </p>
            <p className="mt-1 text-sm text-foreground">{log.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-surface-hover px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {log.action}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {log.entityType}
            </span>
          </div>

          <dl className="grid gap-3 rounded-xl border border-border bg-surface-base/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-subtle">Actor</dt>
              <dd className="mt-0.5 font-medium text-foreground">{log.actorEmail}</dd>
            </div>
            {log.entityId ? (
              <div>
                <dt className="text-xs text-subtle">Entity ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-muted">
                  {log.entityId}
                </dd>
              </div>
            ) : null}
            {log.ipAddress ? (
              <div>
                <dt className="text-xs text-subtle">IP address</dt>
                <dd className="mt-0.5 font-mono text-xs text-muted">{log.ipAddress}</dd>
              </div>
            ) : null}
            {log.actorUid ? (
              <div>
                <dt className="text-xs text-subtle">Actor UID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-muted">
                  {log.actorUid}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="grid gap-4 md:grid-cols-2">
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

          {log.metadata ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Metadata
              </p>
              <JsonBlock value={log.metadata} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
