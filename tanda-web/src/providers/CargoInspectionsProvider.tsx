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
  onSnapshot,
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

function inspectionsQuery() {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  return query(
    collection(db, COLLECTIONS.CARGO_INSPECTIONS),
    orderBy('registeredAt', 'desc'),
    limit(INSPECTIONS_FETCH_LIMIT),
  );
}

export function CargoInspectionsProvider({ children }: { children: ReactNode }) {
  const [inspections, setInspections] = useState<CargoInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Live so new records and evidence URLs appended by the background media
  // queue appear without a manual refresh.
  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      inspectionsQuery(),
      (snapshot) => {
        setInspections(
          sortInspectionsByNewest(
            snapshot.docs.map((document) =>
              mapInspectionDoc(document.id, document.data()),
            ),
          ),
        );
        setError('');
        setLoading(false);
      },
      (snapshotError) => {
        console.error('CargoInspectionsProvider', snapshotError);
        setInspections([]);
        setError('Could not load cargo inspections.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /** Kept for explicit refresh buttons; the snapshot already streams updates. */
  const refresh = useCallback(async () => {
    if (!db) return;

    setError('');

    try {
      const snapshot = await getDocs(inspectionsQuery());
      setInspections(
        sortInspectionsByNewest(
          snapshot.docs.map((document) =>
            mapInspectionDoc(document.id, document.data()),
          ),
        ),
      );
    } catch (fetchError) {
      console.error('CargoInspectionsProvider refresh', fetchError);
      setError('Could not load cargo inspections.');
    }
  }, []);

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
