'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSplash } from '@/components/ui/LoadingSplash';
import { useAuthRole } from '@/hooks/useAuthRole';
import { resolvePostLoginHref } from '@/lib/auth/resolve-post-login-href';

export default function Home() {
  const router = useRouter();
  const { user, role, loading } = useAuthRole();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!role) return;

    let cancelled = false;
    void resolvePostLoginHref(user.email, role).then((href) => {
      if (!cancelled) {
        router.replace(href);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, role, router, user]);

  return <LoadingSplash message="Loading…" />;
}
