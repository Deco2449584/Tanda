'use client';

import { formatKioskActionLabel } from '@/lib/kiosk/kiosk-action-labels';
import type { AttendanceType } from '@/lib/types/attendance';

interface KioskConfirmPunchProps {
  actionType: AttendanceType;
  employeeName: string;
  warehouseLabel: string;
  photoPreviewUrl: string;
  onAccept: () => void;
  onCancel: () => void;
}

function confirmQuestion(actionType: AttendanceType, warehouseLabel: string): string {
  switch (actionType) {
    case 'check_in':
      return `Are you sure you want to clock in at ${warehouseLabel}?`;
    case 'check_out':
      return `Are you sure you want to clock out at ${warehouseLabel}?`;
    case 'break_start':
      return `Are you sure you want to start your break at ${warehouseLabel}?`;
    case 'break_end':
      return `Are you sure you want to end your break at ${warehouseLabel}?`;
  }
}

export function KioskConfirmPunch({
  actionType,
  employeeName,
  warehouseLabel,
  photoPreviewUrl,
  onAccept,
  onCancel,
}: KioskConfirmPunchProps) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 px-2">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Confirm {formatKioskActionLabel(actionType)}
        </p>
        <h2 className="mt-2 text-2xl font-bold capitalize text-white">
          {employeeName || 'Employee'}
        </h2>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoPreviewUrl}
          alt="Captured photo"
          className="h-full w-full object-cover"
        />
      </div>

      <p className="text-center text-base font-medium leading-relaxed text-zinc-100 md:text-lg">
        {confirmQuestion(actionType, warehouseLabel)}
      </p>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onAccept}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/20 text-lg font-semibold text-emerald-200 transition hover:brightness-110"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-base font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
