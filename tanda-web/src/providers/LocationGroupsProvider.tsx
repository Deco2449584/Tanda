'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { subscribeLocationGroups } from '@/lib/location-groups/location-groups-service';
import type { LocationGroup } from '@/lib/types/location-group';

interface LocationGroupsContextValue {
  groups: LocationGroup[];
  activeGroups: LocationGroup[];
  loading: boolean;
  error: string;
}

const LocationGroupsContext = createContext<LocationGroupsContextValue | null>(null);

export function LocationGroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeLocationGroups(
      (data) => {
        setGroups(data);
        setLoading(false);
        setError('');
      },
      () => {
        setLoading(false);
        setError('Could not load location groups.');
      },
    );

    return () => unsubscribe();
  }, []);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.active),
    [groups],
  );

  const value = useMemo(
    () => ({ groups, activeGroups, loading, error }),
    [activeGroups, error, groups, loading],
  );

  return (
    <LocationGroupsContext.Provider value={value}>
      {children}
    </LocationGroupsContext.Provider>
  );
}

export function useLocationGroups() {
  const context = useContext(LocationGroupsContext);
  if (!context) {
    throw new Error('useLocationGroups must be used within LocationGroupsProvider');
  }
  return context;
}
