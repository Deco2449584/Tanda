'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPortalToken } from '@/lib/portal/client-session';

export function PortalAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getPortalToken()) {
      router.replace('/portal');
    }
  }, [router]);

  if (!getPortalToken()) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Verifying access…</p>
      </div>
    );
  }

  return <>{children}</>;
}
