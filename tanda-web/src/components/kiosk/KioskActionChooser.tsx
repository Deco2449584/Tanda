'use client';

import { Coffee, LogIn, LogOut, Play } from 'lucide-react';
import { formatKioskActionLabel } from '@/lib/kiosk/kiosk-action-labels';
import type { AttendanceType } from '@/lib/types/attendance';

interface KioskActionChooserProps {
  employeeName: string;
  allowedActions: AttendanceType[];
  onSelect: (actionType: AttendanceType) => void;
  onCancel: () => void;
}

function actionVisual(actionType: AttendanceType) {
  switch (actionType) {
    case 'check_in':
      return {
        icon: LogIn,
        className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      };
    case 'check_out':
      return {
        icon: LogOut,
        className: 'border-primary/40 bg-primary/15 text-primary',
      };
    case 'break_start':
      return {
        icon: Coffee,
        className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      };
    case 'break_end':
      return {
        icon: Play,
        className: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
      };
  }
}

export function KioskActionChooser({
  employeeName,
  allowedActions,
  onSelect,
  onCancel,
}: KioskActionChooserProps) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 px-2">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Choose action
        </p>
        <h2 className="mt-2 text-2xl font-bold capitalize text-white">
          {employeeName || 'Employee'}
        </h2>
      </div>

      <div className="flex w-full flex-col gap-3">
        {allowedActions.map((actionType) => {
          const visual = actionVisual(actionType);
          const Icon = visual.icon;

          return (
            <button
              key={actionType}
              type="button"
              onClick={() => onSelect(actionType)}
              className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition hover:brightness-110 ${visual.className}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/20">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-lg font-semibold text-white">
                {formatKioskActionLabel(actionType)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-medium text-zinc-400 transition hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}
