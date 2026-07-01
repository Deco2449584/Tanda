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
import { fetchLocationGroups } from '@/lib/location-groups/location-groups-service';
import type { LocationGroup } from '@/lib/types/location-group';

interface LocationGroupsContextValue {
  groups: LocationGroup[];
  activeGroups: LocationGroup[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const LocationGroupsContext = createContext<LocationGroupsContextValue | null>(null);

export function LocationGroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
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
      setGroups(await fetchLocationGroups());
    } catch {
      setError('Could not load location groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.active),
    [groups],
  );

  const value = useMemo(
    () => ({ groups, activeGroups, loading, refreshing, error, refresh }),
    [activeGroups, error, groups, loading, refreshing, refresh],
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
