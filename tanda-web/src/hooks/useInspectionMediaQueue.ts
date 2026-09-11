'use client';

import { useSyncExternalStore } from 'react';
import {
  getInspectionMediaJobs,
  subscribeInspectionMedia,
  type MediaJob,
} from '@/lib/inspect/media-queue';

const EMPTY_JOBS: MediaJob[] = [];

function getServerSnapshot(): MediaJob[] {
  return EMPTY_JOBS;
}

/** Live view of the background evidence upload queue. */
export function useInspectionMediaQueue(): MediaJob[] {
  return useSyncExternalStore(
    subscribeInspectionMedia,
    getInspectionMediaJobs,
    getServerSnapshot,
  );
}
