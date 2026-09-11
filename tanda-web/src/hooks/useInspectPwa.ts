'use client';

import { useEffect } from 'react';
import {
  getInspectionMediaJobs,
  hasPendingInspectionUploads,
  subscribeInspectionMedia,
} from '@/lib/inspect/media-queue';

/** Registers the /inspect-scoped service worker so the app can be installed alone. */
export function useInspectPwa(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register('/inspect/sw.js', { scope: '/inspect/' })
      .catch((error) => {
        console.error('Inspect PWA service worker', error);
      });
  }, []);
}

/** Warns when the operator tries to leave with background uploads still running. */
export function usePendingUploadUnloadGuard(): void {
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasPendingInspectionUploads(getInspectionMediaJobs())) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', onBeforeUnload);

    // Keep the listener in sync if the queue drains while the tab is open.
    const unsubscribe = subscribeInspectionMedia(() => {
      // No-op: the handler reads live queue state on each unload attempt.
    });

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      unsubscribe();
    };
  }, []);
}
