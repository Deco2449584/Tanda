'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { EditIssueReportModal } from '@/components/issues/EditIssueReportModal';
import { IssueReportDetailModal } from '@/components/issues/IssueReportDetailModal';
import {
  formatIssueReportWhen,
  ISSUE_STATUS_CLASSES,
  ISSUE_STATUS_LABELS,
} from '@/components/issues/issue-report-status';
import {
  deleteIssueReportRequest,
  updateIssueReportRequest,
  type SerializedIssueReport,
} from '@/lib/issues/issue-reports-api';
import type { IssueReportCategory, IssueReportStatus } from '@/lib/types/issue-report';

interface IssueReportsAdminTableProps {
  reports: SerializedIssueReport[];
  loading?: boolean;
  onUpdated?: () => void;
  canManage?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function IssueReportsAdminTable({
  reports,
  loading,
  onUpdated,
  canManage = true,
  canUpdate = true,
  canDelete = true,
}: IssueReportsAdminTableProps) {
  const [selectedReport, setSelectedReport] = useState<SerializedIssueReport | null>(null);
  const [editingReport, setEditingReport] = useState<SerializedIssueReport | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleSaveDetail(input: {
    status: IssueReportStatus;
    adminNotes: string;
  }) {
    if (!selectedReport) return;

    setSavingId(selectedReport.id);
    try {
      await updateIssueReportRequest(selectedReport.id, input);
      onUpdated?.();
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(report: SerializedIssueReport) {
    const confirmed = window.confirm(`Delete issue report "${report.subject}"?`);
    if (!confirmed) return;

    setSavingId(report.id);
    try {
      await deleteIssueReportRequest(report.id);
      setSelectedReport(null);
      onUpdated?.();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete report.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveEdit(input: {
    category: IssueReportCategory;
    subject: string;
    description: string;
    status: IssueReportStatus;
    adminNotes: string;
  }) {
    if (!editingReport) return;

    setSavingEdit(true);
    try {
      await updateIssueReportRequest(editingReport.id, input);
      onUpdated?.();
      setEditingReport(null);
      setSelectedReport(null);
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        Loading issue reports…
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        No issue reports yet.
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <li key={report.id}>
            <button
              type="button"
              onClick={() => setSelectedReport(report)}
              className="group flex h-full w-full flex-col rounded-xl border border-border bg-surface-raised p-4 text-left transition hover:border-primary/40 hover:bg-surface-hover/20"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ISSUE_STATUS_CLASSES[report.status] ?? ISSUE_STATUS_CLASSES.open}`}
                >
                  {ISSUE_STATUS_LABELS[report.status] ?? report.status}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:text-primary" />
              </div>

              <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">
                {report.subject}
              </p>

              <p className="mt-1 text-xs text-subtle">
                {report.employeeName} · {report.category}
              </p>

              <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted">
                {report.description}
              </p>

              <p className="mt-3 text-[11px] text-subtle">
                {formatIssueReportWhen(report.createdAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <IssueReportDetailModal
        report={selectedReport}
        open={selectedReport !== null}
        saving={selectedReport ? savingId === selectedReport.id : false}
        canManage={canManage}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onClose={() => !savingId && setSelectedReport(null)}
        onSave={handleSaveDetail}
        onEdit={() => {
          if (selectedReport) {
            setEditingReport(selectedReport);
          }
        }}
        onDelete={() => {
          if (selectedReport) {
            void handleDelete(selectedReport);
          }
        }}
      />

      <EditIssueReportModal
        report={editingReport}
        open={editingReport !== null}
        saving={savingEdit}
        onClose={() => !savingEdit && setEditingReport(null)}
        onSave={handleSaveEdit}
      />
    </>
  );
}
