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
  createShiftNotification,
  dismissAllEmployeeNotifications,
  markAllEmployeeNotificationsRead,
  markEmployeeNotificationRead,
  migrateLocalShiftAlertsToFirestore,
  subscribeToEmployeeNotifications,
} from '@/lib/notifications/notifications-client';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import type { AppNotification } from '@/lib/types/notification';
import type { Shift } from '@/lib/types/shift';

const SHIFT_LOOKBACK_DAYS = 28;
const SHIFT_LOOKAHEAD_DAYS = 90;

interface EmployeeShiftNotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  toastNotification: AppNotification | null;
  dismissToast: () => void;
  markAllRead: () => void;
  markRead: (notificationId: string) => void;
  clearAll: () => void;
}

const EmployeeShiftNotificationsContext =
  createContext<EmployeeShiftNotificationsContextValue | null>(null);

interface EmployeeShiftNotificationsProviderProps {
  userEmail: string;
  employeeCode: string;
  children: ReactNode;
}

export function EmployeeShiftNotificationsProvider({
  userEmail,
  employeeCode,
  children,
}: EmployeeShiftNotificationsProviderProps) {
  const email = userEmail.trim().toLowerCase();
  const code = employeeCode.trim();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(
    null,
  );
  const initialLoadRef = useRef(true);
  const migrationDoneRef = useRef(false);

  useEffect(() => {
    if (!email || !code) {
      setNotifications([]);
      return;
    }

    if (migrationDoneRef.current) return;
    migrationDoneRef.current = true;

    void migrateLocalShiftAlertsToFirestore({
      recipientEmail: email,
      employeeCode: code,
    });
  }, [code, email]);

  useEffect(() => {
    if (!email) {
      setNotifications([]);
      return;
    }

    return subscribeToEmployeeNotifications(email, setNotifications);
  }, [email]);

  const showToast = useCallback((notification: AppNotification) => {
    setToastNotification(notification);
  }, []);

  useEffect(() => {
    if (!db || !code || !email) {
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
          void createShiftNotification({
            recipientEmail: email,
            type: 'assigned',
            shiftId: shift.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
          }).then((notification) => {
            if (notification) showToast(notification);
          });
          return;
        }

        if (change.type === 'removed') {
          const data = change.doc.data() as Partial<Shift>;
          void createShiftNotification({
            recipientEmail: email,
            type: 'cancelled',
            shiftId: change.doc.id,
            date: typeof data.date === 'string' ? data.date : '',
            startTime: typeof data.startTime === 'string' ? data.startTime : '',
            endTime: typeof data.endTime === 'string' ? data.endTime : '',
          }).then((notification) => {
            if (notification) showToast(notification);
          });
        }
      });
    });

    return () => unsubscribe();
  }, [code, email, showToast]);

  const markAllRead = useCallback(() => {
    if (!email) return;
    void markAllEmployeeNotificationsRead(email);
  }, [email]);

  const markRead = useCallback((notificationId: string) => {
    void markEmployeeNotificationRead(notificationId);
  }, []);

  const dismissToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!email) return;
    void dismissAllEmployeeNotifications(email);
    setToastNotification(null);
  }, [email]);

  useEffect(() => {
    if (!toastNotification) return;

    const timeoutId = window.setTimeout(() => {
      setToastNotification(null);
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [toastNotification]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      toastNotification,
      dismissToast,
      markAllRead,
      markRead,
      clearAll,
    }),
    [
      notifications,
      clearAll,
      dismissToast,
      markAllRead,
      markRead,
      toastNotification,
      unreadCount,
    ],
  );

  return (
    <EmployeeShiftNotificationsContext.Provider value={value}>
      {children}
      <ShiftAlertToast notification={toastNotification} onDismiss={dismissToast} />
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
