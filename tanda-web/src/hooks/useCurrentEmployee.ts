'use client';

import { useCurrentEmployeeContext } from '@/providers/CurrentEmployeeProvider';

/**
 * Session employee profile. A single Firestore listener lives in
 * CurrentEmployeeProvider; the optional email argument is ignored and kept
 * so existing call sites do not need to change.
 */
export function useCurrentEmployee(_userEmail?: string | null | undefined) {
  return useCurrentEmployeeContext();
}
