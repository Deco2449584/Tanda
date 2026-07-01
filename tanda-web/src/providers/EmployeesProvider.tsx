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
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

interface EmployeesContextValue {
  employees: Employee[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const EmployeesContext = createContext<EmployeesContextValue | null>(null);

async function fetchEmployees(): Promise<Employee[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const snapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
  return snapshot.docs
    .map((document) => mapEmployeeDoc(document.id, document.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const initialLoadDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!db) {
      setEmployees([]);
      setLoading(false);
      setRefreshing(false);
      setError('Firestore is not available.');
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      setEmployees(await fetchEmployees());
    } catch (fetchError) {
      console.error('EmployeesProvider', fetchError);
      setEmployees([]);
      setError('Could not load employees.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ employees, loading, refreshing, error, refresh }),
    [employees, loading, refreshing, error, refresh],
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
