export const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const ISSUE_STATUS_CLASSES: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  in_progress: 'bg-primary/15 text-primary border-primary/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function formatIssueReportWhen(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
