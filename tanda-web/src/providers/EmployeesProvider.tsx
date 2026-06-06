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
import { collection, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

interface EmployeesContextValue {
  employees: Employee[];
  loading: boolean;
  error: string;
}

const EmployeesContext = createContext<EmployeesContextValue | null>(null);

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Firestore is not available.');
      return;
    }

    setLoading(true);
    setError('');

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((document) => mapEmployeeDoc(document.id, document.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'en'));
        setEmployees(mapped);
        setLoading(false);
        setError('');
      },
      (snapshotError) => {
        console.error('EmployeesProvider', snapshotError);
        setEmployees([]);
        setLoading(false);
        setError('Could not load employees.');
      },
    );

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ employees, loading, error }),
    [employees, loading, error],
  );

  return (
    <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>
  );
}

export function useEmployees(): EmployeesContextValue {
  const context = useContext(EmployeesContext);
  if (!context) {
    throw new Error('useEmployees must be used within EmployeesProvider');
  }
  return context;
}

export function useEmployeesOptional(): EmployeesContextValue | null {
  return useContext(EmployeesContext);
}
