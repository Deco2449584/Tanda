'use client';

import { useEffect, useState } from 'react';
import { KioskDeviceUnauthorized } from '@/components/kiosk/KioskDeviceUnauthorized';
import { KioskScreen } from '@/components/kiosk/KioskScreen';
import { isKioskAuthorizedInStorage, clearKioskAuthorization } from '@/lib/kiosk/device-auth';

type AuthStatus = 'checking' | 'authorized' | 'unauthorized';

export function KioskAuthGuard() {
  const [status, setStatus] = useState<AuthStatus>('checking');

  useEffect(() => {
    const authorized = isKioskAuthorizedInStorage();
    setStatus(authorized ? 'authorized' : 'unauthorized');
  }, []);

  const handleLockDevice = () => {
    clearKioskAuthorization();
    setStatus('unauthorized');
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] max-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-zinc-950">
        <span className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
        <p className="text-sm font-medium tracking-wide text-zinc-400">
          Verifying device…
        </p>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <KioskDeviceUnauthorized onAuthorized={() => setStatus('authorized')} />
    );
  }

  return <KioskScreen onLockDevice={handleLockDevice} />;
}
