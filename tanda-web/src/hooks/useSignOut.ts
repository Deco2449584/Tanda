'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOutUser() {
    if (!auth || signingOut) return;

    setSigningOut(true);

    try {
      await signOut(auth);
      router.push('/login');
    } catch {
      window.alert('No se pudo cerrar la sesión. Intente nuevamente.');
    } finally {
      setSigningOut(false);
    }
  }

  return { signOutUser, signingOut };
}
