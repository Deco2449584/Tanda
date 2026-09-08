'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalToken } from '@/lib/portal/client-session';

export function PortalAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(getPortalToken());
    setAllowed(hasToken);
    setReady(true);
    if (!hasToken) {
      router.replace('/portal');
    }
  }, [router]);

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-white/55">Verifying access…</p>
      </div>
    );
  }

  return <>{children}</>;
}
