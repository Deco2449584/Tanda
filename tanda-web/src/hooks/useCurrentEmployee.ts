'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
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

    getDocs(employeesQuery)
      .then((snapshot) => {
        if (snapshot.empty) {
          setEmployee(null);
          setError('No employee profile linked to this user was found.');
          return;
        }

        const document = snapshot.docs[0];
        setEmployee(mapEmployeeDoc(document.id, document.data()));
        setError('');
      })
      .catch(() => {
        setEmployee(null);
        setError('Could not load the employee profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userEmail]);

  return { employee, loading, error };
}
