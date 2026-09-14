'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ScanPunchPanel } from '@/components/attendance/ScanPunchPanel';
import { storeScanPunchClaim } from '@/lib/attendance/scan-punch-claim';
import type { ScanPunchVia } from '@/lib/attendance/scan-punch-token';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

interface ScanPunchLauncherProps {
  token: string;
  via: ScanPunchVia;
}

/**
 * Hands the scan token to a tab-scoped claim and moves to /punch so the token
 * stops showing in the address bar. Falls back to punching in place when the
 * browser blocks sessionStorage.
 */
export function ScanPunchLauncher({ token, via }: ScanPunchLauncherProps) {
  const router = useRouter();
  const [claimFailed, setClaimFailed] = useState(false);

  useEffect(() => {
    if (!storeScanPunchClaim(token, via)) {
      // Storage is blocked, so punch in place instead of losing the token.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClaimFailed(true);
      return;
    }
    router.replace('/punch');
  }, [router, token, via]);

  if (claimFailed) {
    return <ScanPunchPanel token={token} via={via} />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <CompanyLogo className="h-10 w-auto" />
      </div>
      <section className="space-y-3 rounded-2xl border border-border bg-surface-raised p-6 text-center shadow-lg">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Opening clock-in…
        </p>
        <p className="text-sm text-muted">
          {via === 'nfc' ? 'NFC tag detected.' : 'QR scan detected.'} Keep this
          screen open.
        </p>
      </section>
    </div>
  );
}
