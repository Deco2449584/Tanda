'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, QrCode } from 'lucide-react';
import { ScanPunchPanel } from '@/components/attendance/ScanPunchPanel';
import {
  clearScanPunchClaim,
  readScanPunchClaim,
  type ScanPunchClaim,
} from '@/lib/attendance/scan-punch-claim';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

export default function PunchClaimPage() {
  const [claim, setClaim] = useState<ScanPunchClaim | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // sessionStorage is only readable after mount, so the claim lands post-render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClaim(readScanPunchClaim());
    setChecked(true);
  }, []);

  const handleCompleted = useCallback(() => {
    clearScanPunchClaim();
  }, []);

  if (claim) {
    return (
      <ScanPunchPanel
        token={claim.token}
        via={claim.via}
        loginReturnPath="/punch"
        onCompleted={handleCompleted}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <CompanyLogo className="h-10 w-auto" />
      </div>
      <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-6 text-center shadow-lg">
        {checked ? (
          <>
            <QrCode className="mx-auto h-9 w-9 text-primary" aria-hidden />
            <div>
              <p className="text-lg font-semibold text-foreground">
                Scan the site code again
              </p>
              <p className="mt-2 text-sm text-muted">
                This clock-in link is single use. Scan the QR at the site or tap
                the NFC tag to punch.
              </p>
            </div>
            <Link
              href="/employee-dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Go to my dashboard
            </Link>
          </>
        ) : (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        )}
      </section>
    </div>
  );
}
