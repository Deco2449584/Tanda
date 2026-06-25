'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { KioskPinGate } from '@/components/kiosk/KioskPinGate';
import { useKioskBackButtonTrap } from '@/hooks/useKioskBackButtonTrap';
import { useKioskLockedDisplay } from '@/hooks/useKioskLockedDisplay';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

interface KioskLockedShellProps {
  session: KioskDeviceSession;
  onExitKiosk: () => void | Promise<void>;
  children: ReactNode;
}

export function KioskLockedShell({
  session,
  onExitKiosk,
  children,
}: KioskLockedShellProps) {
  useKioskLockedDisplay(true);

  const [exitPromptOpen, setExitPromptOpen] = useState(false);

  const openExitPrompt = useCallback(() => {
    setExitPromptOpen(true);
  }, []);

  const closeExitPrompt = useCallback(() => {
    setExitPromptOpen(false);
  }, []);

  useKioskBackButtonTrap(true, openExitPrompt);

  const handleExitSuccess = useCallback(async () => {
    closeExitPrompt();
    await onExitKiosk();
  }, [closeExitPrompt, onExitKiosk]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {children}

      <button
        type="button"
        onClick={openExitPrompt}
        aria-label="Exit kiosk mode"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-zinc-400 backdrop-blur transition hover:text-white"
      >
        <Lock className="h-4 w-4" />
      </button>

      {exitPromptOpen ? (
        <div className="fixed inset-0 z-[80]">
          <KioskPinGate
            title="Exit kiosk mode"
            description={`Enter the lock PIN for ${session.name || 'this device'} to leave fullscreen and return to the dashboard.`}
            submitLabel="Exit kiosk"
            onSuccess={() => void handleExitSuccess()}
            onCancel={closeExitPrompt}
          />
        </div>
      ) : null}
    </div>
  );
}
