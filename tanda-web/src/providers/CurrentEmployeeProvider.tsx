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
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { useAuthRole } from '@/hooks/useAuthRole';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

export interface CurrentEmployeeContextValue {
  employee: Employee | null;
  loading: boolean;
  error: string;
  refresh: () => void;
}

const CurrentEmployeeContext = createContext<CurrentEmployeeContextValue | null>(
  null,
);

export function CurrentEmployeeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthRole();
  const userEmail = user?.email?.trim().toLowerCase() ?? '';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const hasLoadedProfileRef = useRef(false);
  const loadedEmailRef = useRef('');

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!userEmail) {
      hasLoadedProfileRef.current = false;
      loadedEmailRef.current = '';
      setEmployee(null);
      setLoading(false);
      setError('No active session.');
      return;
    }

    if (!db) {
      hasLoadedProfileRef.current = false;
      loadedEmailRef.current = '';
      setEmployee(null);
      setLoading(false);
      setError('Firebase is not available.');
      return;
    }

    const sameEmailAlreadyLoaded =
      hasLoadedProfileRef.current && loadedEmailRef.current === userEmail;

    // Soft reload: keep existing profile on screen while the listener reconnects.
    // Flipping loading=true remounts employee shells and closes open menus.
    if (!sameEmailAlreadyLoaded) {
      setLoading(true);
    }
    setError('');

    const employeesQuery = query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('email', '==', userEmail),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      employeesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          hasLoadedProfileRef.current = false;
          loadedEmailRef.current = '';
          setEmployee(null);
          setError('No employee profile linked to this user was found.');
        } else {
          const document = snapshot.docs[0];
          hasLoadedProfileRef.current = true;
          loadedEmailRef.current = userEmail;
          setEmployee(mapEmployeeDoc(document.id, document.data()));
          setError('');
        }
        setLoading(false);
      },
      () => {
        hasLoadedProfileRef.current = false;
        loadedEmailRef.current = '';
        setEmployee(null);
        setError('Could not load the employee profile.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [authLoading, reloadToken, userEmail]);

  const value = useMemo(
    () => ({ employee, loading, error, refresh }),
    [employee, loading, error, refresh],
  );

  return (
    <CurrentEmployeeContext.Provider value={value}>
      {children}
    </CurrentEmployeeContext.Provider>
  );
}

export function useCurrentEmployeeContext(): CurrentEmployeeContextValue {
  const context = useContext(CurrentEmployeeContext);
  if (!context) {
    throw new Error(
      'useCurrentEmployee must be used within CurrentEmployeeProvider',
    );
  }
  return context;
}
