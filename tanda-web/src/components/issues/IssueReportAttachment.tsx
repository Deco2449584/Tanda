'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { downloadIssueReportAttachment } from '@/lib/issues/issue-reports-api';

interface IssueReportAttachmentProps {
  reportId: string;
  url: string;
  alt: string;
}

export function IssueReportAttachment({ reportId, url, alt }: IssueReportAttachmentProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setError('');

    try {
      await downloadIssueReportAttachment(reportId);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : 'Could not download image.',
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface-base">
      <FirebaseImage
        src={url}
        alt={alt}
        width={720}
        height={405}
        className="aspect-video w-full max-w-md object-contain"
        sizes="(max-width: 768px) 100vw, 720px"
        quality={80}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 px-3 py-2">
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          {downloading ? 'Downloading…' : 'Download image'}
        </button>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
