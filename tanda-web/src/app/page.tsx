'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthRole } from '@/hooks/useAuthRole';
import { getHomeRouteForRole } from '@/lib/auth/roles';

export default function Home() {
  const router = useRouter();
  const { user, role, loading } = useAuthRole();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (role) {
      router.replace(getHomeRouteForRole(role));
    }
  }, [loading, role, router, user]);

  return (
    <div className="app-ambient flex h-dvh items-center justify-center bg-surface-base">
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}
