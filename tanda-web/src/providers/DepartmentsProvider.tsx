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
import { fetchDepartments } from '@/lib/departments/departments-service';
import type { Department } from '@/lib/types/department';

interface DepartmentsContextValue {
  departments: Department[];
  activeDepartments: Department[];
  departmentNames: string[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextValue | null>(null);

export function DepartmentsProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const initialLoadDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      setDepartments(await fetchDepartments());
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Could not load departments.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeDepartments = useMemo(
    () => departments.filter((department) => department.active),
    [departments],
  );

  const departmentNames = useMemo(
    () => activeDepartments.map((department) => department.name).filter(Boolean),
    [activeDepartments],
  );

  const value = useMemo(
    () => ({
      departments,
      activeDepartments,
      departmentNames,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [departments, activeDepartments, departmentNames, loading, refreshing, error, refresh],
  );

  return (
    <DepartmentsContext.Provider value={value}>{children}</DepartmentsContext.Provider>
  );
}

export function useDepartments(): DepartmentsContextValue {
  const context = useContext(DepartmentsContext);
  if (!context) {
    throw new Error('useDepartments must be used within DepartmentsProvider.');
  }
  return context;
}
