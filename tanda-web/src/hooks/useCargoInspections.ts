'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { sortInspectionsByNewest } from '@/lib/inspections/filters';
import { mapInspectionDoc } from '@/lib/inspections/map-inspection';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

export function useCargoInspections() {
  const [inspections, setInspections] = useState<CargoInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Firestore is not available.');
      return;
    }

    setLoading(true);
    setError('');

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.CARGO_INSPECTIONS),
      (snapshot) => {
        const mapped = sortInspectionsByNewest(
          snapshot.docs.map((document) =>
            mapInspectionDoc(document.id, document.data()),
          ),
        );
        setInspections(mapped);
        setLoading(false);
        setError('');
      },
      (snapshotError) => {
        console.error('useCargoInspections', snapshotError);
        setInspections([]);
        setLoading(false);
        setError('Could not load cargo inspections.');
      },
    );

    return () => unsubscribe();
  }, []);

  const inspectionsById = useMemo(() => {
    const map = new Map<string, CargoInspection>();
    inspections.forEach((inspection) => {
      map.set(inspection.id, inspection);
    });
    return map;
  }, [inspections]);

  return { inspections, inspectionsById, loading, error };
}
