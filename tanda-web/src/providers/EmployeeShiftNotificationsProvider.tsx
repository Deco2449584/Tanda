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
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ShiftAlertToast } from '@/components/notifications/ShiftAlertToast';
import { COLLECTIONS } from '@/lib/constants';
import {
  offsetInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import { db } from '@/lib/firebase';
import {
  buildShiftAlert,
  loadEmployeeShiftAlerts,
  saveEmployeeShiftAlerts,
  type EmployeeShiftAlert,
} from '@/lib/notifications/employee-shift-alerts';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import type { Shift } from '@/lib/types/shift';

const SHIFT_LOOKBACK_DAYS = 28;
const SHIFT_LOOKAHEAD_DAYS = 90;
const MAX_ALERTS = 30;

interface EmployeeShiftNotificationsContextValue {
  alerts: EmployeeShiftAlert[];
  unreadCount: number;
  toastAlert: EmployeeShiftAlert | null;
  dismissToast: () => void;
  markAllRead: () => void;
  markRead: (alertId: string) => void;
}

const EmployeeShiftNotificationsContext =
  createContext<EmployeeShiftNotificationsContextValue | null>(null);

interface EmployeeShiftNotificationsProviderProps {
  employeeCode: string;
  children: ReactNode;
}

export function EmployeeShiftNotificationsProvider({
  employeeCode,
  children,
}: EmployeeShiftNotificationsProviderProps) {
  const code = employeeCode.trim();
  const [alerts, setAlerts] = useState<EmployeeShiftAlert[]>([]);
  const [toastAlert, setToastAlert] = useState<EmployeeShiftAlert | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!code) {
      setAlerts([]);
      return;
    }

    setAlerts(loadEmployeeShiftAlerts(code));
    initialLoadRef.current = true;
  }, [code]);

  const pushAlert = useCallback(
    (alert: EmployeeShiftAlert) => {
      setAlerts((current) => {
        const next = [alert, ...current.filter((item) => item.id !== alert.id)].slice(
          0,
          MAX_ALERTS,
        );
        saveEmployeeShiftAlerts(code, next);
        return next;
      });
      setToastAlert(alert);
    },
    [code],
  );

  useEffect(() => {
    if (!db || !code) {
      return;
    }

    const todayKey = toInputDate();
    const minDate = offsetInputDate(todayKey, -SHIFT_LOOKBACK_DAYS);
    const maxDate = offsetInputDate(todayKey, SHIFT_LOOKAHEAD_DAYS);

    const shiftsQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('employeeId', '==', code),
      where('date', '>=', minDate),
      where('date', '<=', maxDate),
    );

    const unsubscribe = onSnapshot(shiftsQuery, (snapshot) => {
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const shift = mapShiftDoc(change.doc.id, change.doc.data());
          pushAlert(
            buildShiftAlert({
              type: 'assigned',
              shiftId: shift.id,
              date: shift.date,
              startTime: shift.startTime,
              endTime: shift.endTime,
            }),
          );
          return;
        }

        if (change.type === 'removed') {
          const data = change.doc.data() as Partial<Shift>;
          pushAlert(
            buildShiftAlert({
              type: 'cancelled',
              shiftId: change.doc.id,
              date: typeof data.date === 'string' ? data.date : '',
              startTime: typeof data.startTime === 'string' ? data.startTime : '',
              endTime: typeof data.endTime === 'string' ? data.endTime : '',
            }),
          );
        }
      });
    });

    return () => unsubscribe();
  }, [code, pushAlert]);

  const markAllRead = useCallback(() => {
    setAlerts((current) => {
      const next = current.map((alert) => ({ ...alert, read: true }));
      saveEmployeeShiftAlerts(code, next);
      return next;
    });
  }, [code]);

  const markRead = useCallback(
    (alertId: string) => {
      setAlerts((current) => {
        const next = current.map((alert) =>
          alert.id === alertId ? { ...alert, read: true } : alert,
        );
        saveEmployeeShiftAlerts(code, next);
        return next;
      });
    },
    [code],
  );

  const dismissToast = useCallback(() => {
    setToastAlert(null);
  }, []);

  useEffect(() => {
    if (!toastAlert) return;

    const timeoutId = window.setTimeout(() => {
      setToastAlert(null);
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [toastAlert]);

  const unreadCount = useMemo(
    () => alerts.filter((alert) => !alert.read).length,
    [alerts],
  );

  const value = useMemo(
    () => ({
      alerts,
      unreadCount,
      toastAlert,
      dismissToast,
      markAllRead,
      markRead,
    }),
    [alerts, dismissToast, markAllRead, markRead, toastAlert, unreadCount],
  );

  return (
    <EmployeeShiftNotificationsContext.Provider value={value}>
      {children}
      <ShiftAlertToast alert={toastAlert} onDismiss={dismissToast} />
    </EmployeeShiftNotificationsContext.Provider>
  );
}

export function useEmployeeShiftNotifications() {
  const context = useContext(EmployeeShiftNotificationsContext);
  if (!context) {
    throw new Error(
      'useEmployeeShiftNotifications must be used within EmployeeShiftNotificationsProvider',
    );
  }
  return context;
}
