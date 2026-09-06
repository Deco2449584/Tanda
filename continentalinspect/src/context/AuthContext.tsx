import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import { auth, isFirebaseConfigured } from '@/services/firebaseConfig';
import {
  EmployeeAccessError,
  hasContinentalInspectAccess,
  loadEmployeeProfile,
  resolveRoleFromEmployee,
  resolveUserRole,
  subscribeToEmployeeRecord,
} from '@/services/userRepository';
import type { EmployeeProfile, EmployeeRecord, UserRole } from '@/types/auth';

export type AuthAccessDeniedReason =
  | 'not_found'
  | 'inactive'
  | 'inspect_disabled'
  | 'no_email'
  | 'firestore_unavailable'
  | null;

const INACTIVE_ALERT_MESSAGE =
  'Your account has been deactivated. Please contact management.';

const INSPECT_DISABLED_ALERT_MESSAGE =
  'Continental Inspect access is not enabled for your account. Ask an administrator in TimeTracker.';

type AuthContextValue = {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  profile: EmployeeProfile | null;
  profileSyncFailed: boolean;
  accessDeniedReason: AuthAccessDeniedReason;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function employeeRecordChanged(
  current: EmployeeProfile,
  record: EmployeeRecord,
  email: string,
): boolean {
  const nextRole = resolveRoleFromEmployee(record, email);
  return (
    current.active !== record.active ||
    current.continentalInspectEnabled !== record.continentalInspectEnabled ||
    current.continentalInspectAdmin !== record.continentalInspectAdmin ||
    current.name !== record.name ||
    current.department !== record.department ||
    current.employeeId !== record.employeeId ||
    current.email !== (record.email || email) ||
    current.role !== nextRole ||
    current.locationId !== record.locationId ||
    current.locationGroupId !== record.locationGroupId ||
    current.workforceRole !== record.workforceRole
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [profileSyncFailed, setProfileSyncFailed] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<AuthAccessDeniedReason>(null);
  const [isLoading, setIsLoading] = useState(true);

  const rejectSession = useCallback(async (reason: AuthAccessDeniedReason) => {
    setProfile(null);
    setProfileSyncFailed(false);
    setAccessDeniedReason(reason);
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  }, []);

  const handleInactiveAccount = useCallback(async () => {
    Alert.alert('Account deactivated', INACTIVE_ALERT_MESSAGE);
    await rejectSession('inactive');
  }, [rejectSession]);

  const handleInspectDisabled = useCallback(async () => {
    Alert.alert('Access disabled', INSPECT_DISABLED_ALERT_MESSAGE);
    await rejectSession('inspect_disabled');
  }, [rejectSession]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    let employeeUnsubscribe: (() => void) | undefined;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      employeeUnsubscribe?.();
      employeeUnsubscribe = undefined;
      setAccessDeniedReason(null);

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setProfileSyncFailed(false);
        setIsLoading(false);
        return;
      }

      setUser(firebaseUser);
      setIsLoading(true);
      setProfileSyncFailed(false);

      try {
        const { profile: nextProfile } = await loadEmployeeProfile(
          firebaseUser.uid,
          firebaseUser.email,
        );

        if (cancelled) return;

        setProfile(nextProfile);
        setProfileSyncFailed(false);
        setAccessDeniedReason(null);

        employeeUnsubscribe = subscribeToEmployeeRecord(nextProfile.docId, (record) => {
          if (!record || !record.active) {
            void handleInactiveAccount();
            return;
          }

          if (!hasContinentalInspectAccess(record)) {
            void handleInspectDisabled();
            return;
          }

          setProfile((current) => {
            if (!current || current.docId !== nextProfile.docId) {
              return current;
            }

            const email = firebaseUser.email ?? current.email;
            if (!employeeRecordChanged(current, record, email)) {
              return current;
            }

            return {
              ...current,
              ...record,
              email: record.email || email,
              role: resolveRoleFromEmployee(record, email),
            };
          });
        });
      } catch (error) {
        setProfile(null);

        if (error instanceof EmployeeAccessError) {
          if (
            error.code === 'not_found' ||
            error.code === 'inactive' ||
            error.code === 'inspect_disabled' ||
            error.code === 'no_email'
          ) {
            if (error.code === 'inactive') {
              Alert.alert('Account deactivated', INACTIVE_ALERT_MESSAGE);
            }
            if (error.code === 'inspect_disabled') {
              Alert.alert('Access disabled', INSPECT_DISABLED_ALERT_MESSAGE);
            }
            await rejectSession(error.code);
            return;
          }
          setProfileSyncFailed(true);
          await rejectSession('firestore_unavailable');
          return;
        }

        setProfileSyncFailed(true);
        await rejectSession('firestore_unavailable');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      employeeUnsubscribe?.();
    };
  }, [rejectSession, handleInactiveAccount, handleInspectDisabled]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase is not configured for this build.');
    }
    setAccessDeniedReason(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setProfile(null);
    setProfileSyncFailed(false);
    setAccessDeniedReason(null);
  }, []);

  const role = resolveUserRole(user?.email, profile);
  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      user,
      role,
      isAdmin,
      profile,
      profileSyncFailed,
      accessDeniedReason,
      isLoading,
      isConfigured: isFirebaseConfigured,
      signIn,
      signOut,
    }),
    [
      user,
      role,
      isAdmin,
      profile,
      profileSyncFailed,
      accessDeniedReason,
      isLoading,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
