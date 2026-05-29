'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    if (!userEmail) {
      setEmployee(null);
      setLoading(false);
      setError('No hay sesión activa.');
      return;
    }

    setLoading(true);

    const normalizedEmail = userEmail.trim().toLowerCase();

    const employeesQuery = query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('email', '==', normalizedEmail),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      employeesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setEmployee(null);
          setError('No se encontró un perfil de empleado vinculado a este usuario.');
        } else {
          const document = snapshot.docs[0];
          setEmployee(mapEmployeeDoc(document.id, document.data()));
          setError('');
        }
        setLoading(false);
      },
      () => {
        setEmployee(null);
        setError('No se pudo cargar el perfil del empleado.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userEmail]);

  return { employee, loading, error };
}
