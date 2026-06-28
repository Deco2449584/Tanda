'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { subscribeDepartments } from '@/lib/departments/departments-service';
import type { Department } from '@/lib/types/department';

interface DepartmentsContextValue {
  departments: Department[];
  activeDepartments: Department[];
  departmentNames: string[];
  loading: boolean;
  error: string;
}

const DepartmentsContext = createContext<DepartmentsContextValue | null>(null);

export function DepartmentsProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeDepartments(
      (data) => {
        setDepartments(data);
        setLoading(false);
        setError('');
      },
      (subscribeError) => {
        setLoading(false);
        setError(subscribeError.message);
      },
    );

    return () => unsubscribe();
  }, []);

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
      error,
    }),
    [departments, activeDepartments, departmentNames, loading, error],
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
