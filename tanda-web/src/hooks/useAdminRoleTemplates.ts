'use client';

import { useEffect, useState } from 'react';
import { fetchAdminRoles } from '@/lib/admin-roles/admin-roles-client';
import type { AdminRoleTemplate } from '@/lib/types/admin-role';

export function useAdminRoleTemplates(enabled = true) {
  const [roles, setRoles] = useState<AdminRoleTemplate[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchAdminRoles()
      .then((items) => {
        if (cancelled) return;
        setRoles(items.filter((role) => role.active));
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Could not load access roles.',
        );
        setRoles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { roles, loading, error };
}
