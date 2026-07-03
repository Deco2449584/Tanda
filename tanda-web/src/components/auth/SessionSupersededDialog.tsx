'use client';

import { MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SessionSupersededDialogProps {
  open: boolean;
  accepting: boolean;
  onAccept: () => void;
}

export function SessionSupersededDialog({
  open,
  accepting,
  onAccept,
}: SessionSupersededDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-superseded-title"
      aria-describedby="session-superseded-description"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface-raised p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
            <MonitorSmartphone className="h-6 w-6" aria-hidden />
          </span>
          <h2
            id="session-superseded-title"
            className="mt-4 text-lg font-semibold text-foreground"
          >
            Session active in another browser
          </h2>
          <p
            id="session-superseded-description"
            className="mt-2 text-sm leading-relaxed text-muted"
          >
            Your account was signed in somewhere else. This session will be closed
            when you continue.
          </p>
        </div>
        <Button
          type="button"
          className="mt-6 w-full"
          onClick={onAccept}
          disabled={accepting}
        >
          {accepting ? 'Closing session…' : 'Accept'}
        </Button>
      </div>
    </div>
  );
}
