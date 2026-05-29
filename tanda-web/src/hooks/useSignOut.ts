'use client';

import { useAuthRole } from '@/hooks/useAuthRole';

export function useSignOut() {
  const { signOutUser, signingOut } = useAuthRole();

  return { signOutUser, signingOut };
}
