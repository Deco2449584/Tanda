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
import { fetchLocations } from '@/lib/locations/locations-service';
import type { Location } from '@/lib/types/location';

interface LocationsContextValue {
  locations: Location[];
  activeLocations: Location[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const LocationsContext = createContext<LocationsContextValue | null>(null);

export function LocationsProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
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
      setLocations(await fetchLocations());
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Could not load locations.',
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

  const activeLocations = useMemo(
    () => locations.filter((location) => location.active),
    [locations],
  );

  const value = useMemo(
    () => ({
      locations,
      activeLocations,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [locations, activeLocations, loading, refreshing, error, refresh],
  );

  return (
    <LocationsContext.Provider value={value}>{children}</LocationsContext.Provider>
  );
}

export function useLocations(): LocationsContextValue {
  const context = useContext(LocationsContext);
  if (!context) {
    throw new Error('useLocations must be used within LocationsProvider.');
  }
  return context;
}
