'use client';

import { useAuthContext } from '@/providers/AuthProvider';

export function useAuthRole() {
  return useAuthContext();
}
