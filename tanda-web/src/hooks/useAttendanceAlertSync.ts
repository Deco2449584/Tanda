'use client';

import { useEffect } from 'react';
import { auth } from '@/lib/firebase';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function useAttendanceAlertSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !auth) return;

    let cancelled = false;

    async function syncAlerts() {
      const user = auth?.currentUser;
      if (!user || cancelled) return;

      try {
        const token = await user.getIdToken();
        await fetch('/api/attendance/evaluate-alerts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('useAttendanceAlertSync', error);
      }
    }

    void syncAlerts();
    const intervalId = window.setInterval(() => {
      void syncAlerts();
    }, SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled]);
}
