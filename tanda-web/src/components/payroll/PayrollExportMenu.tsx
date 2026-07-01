'use client';

import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import type { PayrollReport } from '@/lib/attendance/export-payroll-csv';

export type PayrollExportType =
  | 'summary'
  | 'by-location'
  | 'by-department'
  | 'journal'
  | 'timesheet'
  | 'leave';

const EXPORT_OPTIONS: Array<{ id: PayrollExportType; label: string }> = [
  { id: 'summary', label: 'Payroll summary (CSV)' },
  { id: 'by-location', label: 'Payroll by location (CSV)' },
  { id: 'by-department', label: 'Payroll by department (CSV)' },
  { id: 'journal', label: 'Payroll journal (CSV)' },
  { id: 'timesheet', label: 'Timesheet detail with pay (CSV)' },
  { id: 'leave', label: 'Approved leave in period (CSV)' },
];

interface PayrollExportMenuProps {
  disabled?: boolean;
  onExport: (type: PayrollExportType) => void;
  report: PayrollReport | null;
}

export function PayrollExportMenu({
  disabled = false,
  onExport,
  report,
}: PayrollExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || !report}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface-raised/80 px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download className="h-4 w-4" strokeWidth={2} />
        Export CSV
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close export menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface-raised py-1 shadow-2xl"
          >
            {EXPORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-surface-hover"
                onClick={() => {
                  onExport(option.id);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
