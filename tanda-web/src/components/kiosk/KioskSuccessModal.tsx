'use client';

import { CheckCircle2 } from 'lucide-react';

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

  const iconGlow = isClockOut
    ? 'shadow-[0_0_24px_color-mix(in_srgb,var(--brand-primary)_55%,transparent)] bg-primary/25 text-primary'
    : 'shadow-[0_0_24px_rgba(16,185,129,0.45)] bg-emerald-500/25 text-emerald-400';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/85 px-4 backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-success-title"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-md md:p-10">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full md:h-24 md:w-24 ${iconGlow}`}
          >
            <CheckCircle2 className="h-11 w-11 md:h-14 md:w-14" strokeWidth={2.25} />
          </div>

          <p
            className={`text-xs font-bold tracking-[0.22em] md:text-sm ${
              isClockOut ? 'text-primary' : 'text-emerald-400'
            }`}
          >
            {actionHeadline}
          </p>

          <h2
            id="kiosk-success-title"
            className="mt-3 max-w-full text-3xl font-extrabold capitalize tracking-tight text-white"
          >
            {data.employeeName || 'Employee'}
          </h2>

          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Recorded at
          </p>

          <p className="my-2 text-5xl font-black tabular-nums text-white">
            {formatRecordedTime(data.recordedAt)}
          </p>

          <div className="relative mt-5 h-24 w-24 overflow-hidden rounded-full ring-4 ring-zinc-800 md:mt-6">
            {/* Local blob preview — no Firebase fetch */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.photoPreviewUrl}
              alt="Captured attendance photo"
              width={96}
              height={96}
              loading="eager"
              decoding="async"
              draggable={false}
              className="h-full w-full rounded-full object-cover"
            />
          </div>

          <p className="mt-6 text-sm text-zinc-500 animate-pulse">Finalizing…</p>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="kiosk-finalize-bar h-full origin-left rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
