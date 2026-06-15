'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { subscribeLocations } from '@/lib/locations/locations-service';
import type { Location } from '@/lib/types/location';

interface LocationsContextValue {
  locations: Location[];
  activeLocations: Location[];
  loading: boolean;
  error: string;
}

const LocationsContext = createContext<LocationsContextValue | null>(null);

export function LocationsProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeLocations(
      (data) => {
        setLocations(data);
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

  const activeLocations = useMemo(
    () => locations.filter((location) => location.active),
    [locations],
  );

  const value = useMemo(
    () => ({
      locations,
      activeLocations,
      loading,
      error,
    }),
    [locations, activeLocations, loading, error],
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
