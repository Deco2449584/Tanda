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
      <div className="w-full max-w-md rounded-2xl border border-blue-300/25 bg-zinc-900/95 p-5 shadow-2xl md:rounded-3xl md:p-8">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full md:mb-5 md:h-20 md:w-20 ${
              isClockOut
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <CheckCircle2 className="h-9 w-9 md:h-12 md:w-12" strokeWidth={2} />
          </div>

          <h2
            id="kiosk-success-title"
            className="text-xl font-bold tracking-tight text-white md:text-2xl"
          >
            {data.employeeName || 'Employee'}
          </h2>

          <p
            className={`mt-2 text-xs font-bold tracking-[0.15em] md:mt-3 md:text-sm md:tracking-[0.2em] ${
              isClockOut ? 'text-blue-400' : 'text-emerald-400'
            }`}
          >
            {actionHeadline}
          </p>

          <p className="mt-2 text-3xl font-bold tabular-nums text-white md:mt-4 md:text-4xl">
            {formatRecordedTime(data.recordedAt)}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-zinc-500 md:mt-1 md:text-xs">
            Recorded at
          </p>

          <div className="relative mt-4 h-20 w-20 overflow-hidden rounded-full border-4 border-blue-500/40 shadow-lg ring-2 ring-blue-400/20 md:mt-6 md:h-28 md:w-28">
            <Image
              src={data.photoPreviewUrl}
              alt="Captured attendance photo"
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          <p className="mt-3 text-xs text-zinc-400 md:mt-6 md:text-sm">
            Returning to PIN entry…
          </p>
        </div>
      </div>
    </div>
  );
}
