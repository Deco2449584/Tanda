'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { useAuthRole } from '@/hooks/useAuthRole';
import { fetchAllowedInspectClients } from '@/lib/inspect/access';
import type { UserRole } from '@/lib/auth/roles';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

interface InspectSessionContextValue {
  user: User;
  role: UserRole | null;
  employee: Employee | null;
  isInspectAdmin: boolean;
  clients: Location[];
  clientsLoading: boolean;
  clientsError: string;
  signOutUser: () => Promise<void>;
}

const InspectSessionContext = createContext<InspectSessionContextValue | null>(
  null,
);

interface InspectSessionProviderProps {
  user: User;
  employee: Employee | null;
  isInspectAdmin: boolean;
  children: ReactNode;
}

export function InspectSessionProvider({
  user,
  employee,
  isInspectAdmin,
  children,
}: InspectSessionProviderProps) {
  const { role, signOutUser } = useAuthRole();
  const [clients, setClients] = useState<Location[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAllowedInspectClients(employee, isInspectAdmin)
      .then((result) => {
        if (cancelled) return;
        setClients(result);
        setClientsError('');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('InspectSessionProvider clients', error);
        setClients([]);
        setClientsError('Could not load your assigned clients.');
      })
      .finally(() => {
        if (cancelled) return;
        setClientsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee, isInspectAdmin]);

  const value = useMemo(
    () => ({
      user,
      role,
      employee,
      isInspectAdmin,
      clients,
      clientsLoading,
      clientsError,
      signOutUser,
    }),
    [
      user,
      role,
      employee,
      isInspectAdmin,
      clients,
      clientsLoading,
      clientsError,
      signOutUser,
    ],
  );

  return (
    <InspectSessionContext.Provider value={value}>
      {children}
    </InspectSessionContext.Provider>
  );
}

export function useInspectSession(): InspectSessionContextValue {
  const context = useContext(InspectSessionContext);
  if (!context) {
    throw new Error(
      'useInspectSession must be used within InspectSessionProvider',
    );
  }
  return context;
}
