'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { sortInspectionsByNewest } from '@/lib/inspections/filters';
import { mapInspectionDoc } from '@/lib/inspections/map-inspection';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectInspectionsContextValue {
  inspections: CargoInspection[];
  inspectionsById: Map<string, CargoInspection>;
  loading: boolean;
  error: string;
}

const InspectInspectionsContext =
  createContext<InspectInspectionsContextValue | null>(null);

interface InspectInspectionsProviderProps {
  /** Inspect admins see every record; operators only their own, as on mobile. */
  scopeToUserId: string | null;
  children: ReactNode;
}

export function InspectInspectionsProvider({
  scopeToUserId,
  children,
}: InspectInspectionsProviderProps) {
  const [inspections, setInspections] = useState<CargoInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;

    const inspectionsQuery = scopeToUserId
      ? query(
          collection(db, COLLECTIONS.CARGO_INSPECTIONS),
          where('userId', '==', scopeToUserId),
        )
      : query(collection(db, COLLECTIONS.CARGO_INSPECTIONS));

    const unsubscribe = onSnapshot(
      inspectionsQuery,
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
        console.error('InspectInspectionsProvider', snapshotError);
        setInspections([]);
        setError('Could not load cargo inspections.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [scopeToUserId]);

  const inspectionsById = useMemo(() => {
    const map = new Map<string, CargoInspection>();
    inspections.forEach((inspection) => map.set(inspection.id, inspection));
    return map;
  }, [inspections]);

  const value = useMemo(
    () => ({ inspections, inspectionsById, loading, error }),
    [inspections, inspectionsById, loading, error],
  );

  return (
    <InspectInspectionsContext.Provider value={value}>
      {children}
    </InspectInspectionsContext.Provider>
  );
}

export function useInspectInspections(): InspectInspectionsContextValue {
  const context = useContext(InspectInspectionsContext);
  if (!context) {
    throw new Error(
      'useInspectInspections must be used within InspectInspectionsProvider',
    );
  }
  return context;
}
