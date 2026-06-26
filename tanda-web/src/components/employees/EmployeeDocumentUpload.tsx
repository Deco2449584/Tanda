'use client';

import { FileText, Upload } from 'lucide-react';

interface EmployeeDocumentUploadProps {
  label: string;
  description?: string;
  selectedFile: File | null;
  currentFileName?: string;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function EmployeeDocumentUpload({
  label,
  description,
  selectedFile,
  currentFileName,
  onFileChange,
  disabled = false,
}: EmployeeDocumentUploadProps) {
  const displayName = selectedFile?.name ?? currentFileName;

  return (
    <div className="rounded-xl border border-border bg-surface-base/40 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-subtle">{description}</p>
          ) : null}
          {displayName ? (
            <p className="mt-2 truncate text-xs text-muted">Selected: {displayName}</p>
          ) : (
            <p className="mt-2 text-xs text-subtle">No file attached yet.</p>
          )}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-hover has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <Upload className="h-3.5 w-3.5" />
            Choose file
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={disabled}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onFileChange(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
