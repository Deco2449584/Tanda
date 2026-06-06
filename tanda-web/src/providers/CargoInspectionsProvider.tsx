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
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { sortInspectionsByNewest } from '@/lib/inspections/filters';
import { mapInspectionDoc } from '@/lib/inspections/map-inspection';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const INSPECTIONS_FETCH_LIMIT = 500;

interface CargoInspectionsContextValue {
  inspections: CargoInspection[];
  inspectionsById: Map<string, CargoInspection>;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const CargoInspectionsContext =
  createContext<CargoInspectionsContextValue | null>(null);

async function fetchInspections(): Promise<CargoInspection[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.CARGO_INSPECTIONS),
      orderBy('registeredAt', 'desc'),
      limit(INSPECTIONS_FETCH_LIMIT),
    ),
  );

  return sortInspectionsByNewest(
    snapshot.docs.map((document) =>
      mapInspectionDoc(document.id, document.data()),
    ),
  );
}

export function CargoInspectionsProvider({ children }: { children: ReactNode }) {
  const [inspections, setInspections] = useState<CargoInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setInspections(await fetchInspections());
    } catch (fetchError) {
      console.error('CargoInspectionsProvider', fetchError);
      setInspections([]);
      setError('Could not load cargo inspections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inspectionsById = useMemo(() => {
    const map = new Map<string, CargoInspection>();
    inspections.forEach((inspection) => {
      map.set(inspection.id, inspection);
    });
    return map;
  }, [inspections]);

  const value = useMemo(
    () => ({
      inspections,
      inspectionsById,
      loading,
      error,
      refresh,
    }),
    [inspections, inspectionsById, loading, error, refresh],
  );

  return (
    <CargoInspectionsContext.Provider value={value}>
      {children}
    </CargoInspectionsContext.Provider>
  );
}

export function useCargoInspections(): CargoInspectionsContextValue {
  const context = useContext(CargoInspectionsContext);
  if (!context) {
    throw new Error(
      'useCargoInspections must be used within CargoInspectionsProvider',
    );
  }
  return context;
}
