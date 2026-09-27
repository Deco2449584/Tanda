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
import { collection, getDocs, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import {
  isDateInRange,
  normalizeInputDate,
  offsetInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { db } from '@/lib/firebase';
import type { Shift } from '@/lib/types/shift';

export const EMPLOYEE_SHIFT_LOOKBACK_DAYS = 28;
export const EMPLOYEE_SHIFT_LOOKAHEAD_DAYS = 90;

export interface EmployeeShiftsContextValue {
  allShifts: Shift[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const EmployeeShiftsContext = createContext<EmployeeShiftsContextValue | null>(
  null,
);

async function fetchEmployeeShifts(employeeCode: string): Promise<Shift[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const todayKey = toInputDate();
  const minDate = offsetInputDate(todayKey, -EMPLOYEE_SHIFT_LOOKBACK_DAYS);
  const maxDate = offsetInputDate(todayKey, EMPLOYEE_SHIFT_LOOKAHEAD_DAYS);
  const shiftsRef = collection(db, COLLECTIONS.SHIFTS);

  try {
    const snapshot = await getDocs(
      query(
        shiftsRef,
        where('employeeId', '==', employeeCode),
        where('date', '>=', minDate),
        where('date', '<=', maxDate),
      ),
    );
    return snapshot.docs.map((document) =>
      mapShiftDoc(document.id, document.data()),
    );
  } catch (rangeError) {
    console.warn(
      'EmployeeShiftsProvider ranged query failed, falling back',
      rangeError,
    );
    const snapshot = await getDocs(
      query(shiftsRef, where('employeeId', '==', employeeCode)),
    );
    return snapshot.docs
      .filter((document) => {
        const date = normalizeInputDate(
          typeof document.data().date === 'string' ? document.data().date : '',
        );
        return date && isDateInRange(date, minDate, maxDate);
      })
      .map((document) => mapShiftDoc(document.id, document.data()));
  }
}

export function EmployeeShiftsProvider({
  employeeCode,
  children,
}: {
  employeeCode: string;
  children: ReactNode;
}) {
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const initialLoadDoneRef = useRef(false);
  const code = employeeCode.trim();

  const refresh = useCallback(async () => {
    if (!db || !code) {
      setAllShifts([]);
      setLoading(false);
      setRefreshing(false);
      setError('');
      initialLoadDoneRef.current = false;
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      setAllShifts(await fetchEmployeeShifts(code));
    } catch (fetchError) {
      console.error('EmployeeShiftsProvider', fetchError);
      setAllShifts([]);
      setError('Could not load shifts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [code]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ allShifts, loading, refreshing, error, refresh }),
    [allShifts, loading, refreshing, error, refresh],
  );

  return (
    <EmployeeShiftsContext.Provider value={value}>
      {children}
    </EmployeeShiftsContext.Provider>
  );
}

export function useEmployeeShiftsContext(): EmployeeShiftsContextValue {
  const context = useContext(EmployeeShiftsContext);
  if (!context) {
    throw new Error(
      'useEmployeeShifts must be used within EmployeeShiftsProvider',
    );
  }
  return context;
}
