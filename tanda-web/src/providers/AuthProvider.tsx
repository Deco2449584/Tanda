'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getRoleFromEmail, type UserRole } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signingOut: boolean;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setRole(firebaseUser ? getRoleFromEmail(firebaseUser.email) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth || signingOut) return;

    setSigningOut(true);
    setUser(null);
    setRole(null);
    setLoading(true);

    try {
      await signOut(auth);
      router.replace('/login');
    } catch {
      window.alert('Could not sign out. Please try again.');
      setLoading(false);
    } finally {
      setSigningOut(false);
    }
  }, [router, signingOut]);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      signingOut,
      signOutUser,
    }),
    [user, role, loading, signingOut, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
