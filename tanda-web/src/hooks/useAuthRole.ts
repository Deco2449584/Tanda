'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getRoleFromEmail, type UserRole } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';

interface AuthRoleState {
  user: User | null;
  role: UserRole;
  loading: boolean;
}

export function useAuthRole(): AuthRoleState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('empleado');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setRole(getRoleFromEmail(firebaseUser?.email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
}
