'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  fetchEmployeeSessionForEmail,
  getEmployeeSessionBlockMessage,
} from '@/lib/auth/employee-session';
import {
  claimAuthSession,
  releaseOwnedAuthSession,
  subscribeToAuthSession,
} from '@/lib/auth/auth-session-client';
import {
  createAndStoreAuthSessionId,
  getStoredAuthSessionId,
  setAuthSessionMessage,
} from '@/lib/auth/auth-session-storage';
import { isKioskRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';
import { disconnectKioskDeviceSession } from '@/lib/kiosk/disconnect-kiosk-device';
import { releaseKioskSession } from '@/lib/kiosk/clear-kiosk-session';
import { SessionSupersededDialog } from '@/components/auth/SessionSupersededDialog';

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
  const [sessionSupersededOpen, setSessionSupersededOpen] = useState(false);
  const [acceptingSuperseded, setAcceptingSuperseded] = useState(false);
  const sessionSupersededRef = useRef(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let roleRequestId = 0;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser?.email) {
        setRole(null);
        setLoading(false);
        return;
      }

      const requestId = ++roleRequestId;
      setLoading(true);

      void fetchEmployeeSessionForEmail(firebaseUser.email)
        .then((session) => {
          if (requestId !== roleRequestId) return;

          const blockMessage = getEmployeeSessionBlockMessage(session);
          if (blockMessage) {
            if (!auth) {
              setRole(null);
              return;
            }

            void releaseKioskSession().finally(() => {
              if (!auth) {
                setRole(null);
                return;
              }

              void signOut(auth).finally(() => {
                if (requestId !== roleRequestId) return;
                setUser(null);
                setRole(null);
              });
            });
            return;
          }

          setRole(session.role);
        })
        .catch((error) => {
          console.error('AuthProvider role resolution', error);
          if (requestId !== roleRequestId) return;
          setRole('empleado');
        })
        .finally(() => {
          if (requestId !== roleRequestId) return;
          setLoading(false);
        });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth || !user?.uid || role === null || isKioskRole(role)) {
      sessionSupersededRef.current = false;
      setSessionSupersededOpen(false);
      setAcceptingSuperseded(false);
      return;
    }

    let cancelled = false;
    let unsubscribeSession: (() => void) | null = null;
    sessionSupersededRef.current = false;
    setSessionSupersededOpen(false);
    setAcceptingSuperseded(false);

    const showSessionConflict = () => {
      if (sessionSupersededRef.current) return;
      sessionSupersededRef.current = true;
      setSessionSupersededOpen(true);
    };

    const ensureSessionClaimed = async () => {
      if (cancelled || sessionSupersededRef.current) return;

      let sessionId = getStoredAuthSessionId();
      if (!sessionId) {
        sessionId = createAndStoreAuthSessionId();
      }

      try {
        await claimAuthSession(sessionId);
      } catch (error) {
        console.error('AuthProvider claim session', error);
      }
    };

    unsubscribeSession = subscribeToAuthSession(user.uid, (remoteSessionId) => {
      if (cancelled || sessionSupersededRef.current) return;

      const localSessionId = getStoredAuthSessionId();

      if (!remoteSessionId) {
        if (!localSessionId) {
          void ensureSessionClaimed();
        }
        return;
      }

      if (!localSessionId || remoteSessionId !== localSessionId) {
        showSessionConflict();
      }
    });

    return () => {
      cancelled = true;
      unsubscribeSession?.();
    };
  }, [role, user?.uid]);

  const handleAcceptSupersededSession = useCallback(async () => {
    if (!auth || acceptingSuperseded) return;

    setAcceptingSuperseded(true);
    setAuthSessionMessage(
      'Your account was signed in on another browser. Sign in again to continue here.',
    );

    try {
      await releaseKioskSession();
      await signOut(auth);
      setSessionSupersededOpen(false);
      setUser(null);
      setRole(null);
      router.replace('/login?session=superseded');
    } catch {
      window.location.assign('/login?session=superseded');
    } finally {
      setAcceptingSuperseded(false);
    }
  }, [acceptingSuperseded, router]);

  const signOutUser = useCallback(async () => {
    if (!auth || signingOut) return;

    setSigningOut(true);
    setUser(null);
    setRole(null);
    setLoading(true);

    try {
      await disconnectKioskDeviceSession();
      await releaseKioskSession();
      await releaseOwnedAuthSession();
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionSupersededDialog
        open={sessionSupersededOpen}
        accepting={acceptingSuperseded}
        onAccept={() => void handleAcceptSupersededSession()}
      />
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
