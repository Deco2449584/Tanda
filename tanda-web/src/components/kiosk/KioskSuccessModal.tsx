'use client';

import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export interface KioskSuccessData {
  employeeName: string;
  actionType: 'check_in' | 'check_out';
  recordedAt: Date;
  photoPreviewUrl: string;
}

interface KioskSuccessModalProps {
  data: KioskSuccessData;
}

function formatRecordedTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function KioskSuccessModal({ data }: KioskSuccessModalProps) {
  const isClockOut = data.actionType === 'check_out';
  const actionHeadline = isClockOut
    ? 'SUCCESSFUL CLOCK OUT'
    : 'SUCCESSFUL CLOCK IN';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/90 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-success-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-blue-300/25 bg-zinc-900/95 p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${
              isClockOut
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <CheckCircle2 className="h-12 w-12" strokeWidth={2} />
          </div>

          <h2
            id="kiosk-success-title"
            className="text-2xl font-bold tracking-tight text-white"
          >
            {data.employeeName || 'Employee'}
          </h2>

          <p
            className={`mt-3 text-sm font-bold tracking-[0.2em] ${
              isClockOut ? 'text-blue-400' : 'text-emerald-400'
            }`}
          >
            {actionHeadline}
          </p>

          <p className="mt-4 text-4xl font-bold tabular-nums text-white">
            {formatRecordedTime(data.recordedAt)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">
            Recorded at
          </p>

          <div className="relative mt-6 h-28 w-28 overflow-hidden rounded-full border-4 border-blue-500/40 shadow-lg ring-2 ring-blue-400/20">
            <Image
              src={data.photoPreviewUrl}
              alt="Captured attendance photo"
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          <p className="mt-6 text-sm text-zinc-400">
            Returning to PIN entry…
          </p>
        </div>
      </div>
    </div>
  );
}
