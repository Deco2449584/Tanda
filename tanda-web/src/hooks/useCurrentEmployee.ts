'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

export function useCurrentEmployee(userEmail: string | null | undefined) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setEmployee(null);
      setLoading(false);
      setError('No active session.');
      return;
    }

    if (!db) {
      setLoading(false);
      setError('Firebase is not available.');
      return;
    }

    setLoading(true);
    setError('');

    const employeesQuery = query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('email', '==', userEmail.trim().toLowerCase()),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      employeesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setEmployee(null);
          setError('No employee profile linked to this user was found.');
        } else {
          const document = snapshot.docs[0];
          setEmployee(mapEmployeeDoc(document.id, document.data()));
          setError('');
        }
        setLoading(false);
      },
      () => {
        setEmployee(null);
        setError('Could not load the employee profile.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userEmail, reloadToken]);

  return { employee, loading, error, refresh };
}
