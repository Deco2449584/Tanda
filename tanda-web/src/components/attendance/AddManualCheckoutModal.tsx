'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { X } from 'lucide-react';
import {
  formatRecordDate,
  formatRecordTime,
  formValuesToTimestamp,
  timestampToFormValues,
} from '@/lib/attendance/format';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

interface AddManualCheckoutModalProps {
  checkInRecord: AttendanceRecord | null;
  employee: Employee | null;
  allRecords: AttendanceRecord[];
  onClose: () => void;
}

function defaultCheckoutValues(checkIn: AttendanceRecord): { date: string; time: string } {
  const checkInValues = timestampToFormValues(checkIn.timestampServer);
  return {
    date: checkInValues.date,
    time: '17:00',
  };
}

export function AddManualCheckoutModal({
  checkInRecord,
  employee,
  allRecords,
  onClose,
}: AddManualCheckoutModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!checkInRecord) return;
    const defaults = defaultCheckoutValues(checkInRecord);
    setDate(defaults.date);
    setTime(defaults.time);
    setError('');
  }, [checkInRecord]);

  const checkInMs = useMemo(
    () => checkInRecord?.timestampServer?.toMillis() ?? 0,
    [checkInRecord],
  );

  if (!checkInRecord) return null;

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (!date || !time) {
      setError('Enter a valid date and time.');
      return;
    }

    const checkoutTimestamp = formValuesToTimestamp(date, time);
    const checkoutMs = checkoutTimestamp.toMillis();

    if (!checkInMs || checkoutMs <= checkInMs) {
      setError('Check-out must be after the check-in time.');
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, COLLECTIONS.ATTENDANCE_RECORDS), {
        employeeId: checkInRecord.employeeId,
        employeeNameSnapshot: checkInRecord.employeeNameSnapshot,
        employeeEmailSnapshot: employee?.email ?? '',
        type: 'check_out',
        timestampServer: checkoutTimestamp,
        source: 'web-admin-manual-checkout',
        photoCaptured: false,
        photoPath: '',
        photoUrl: '',
      });

      const employeeRecords = allRecords.filter(
        (item) => item.employeeId === checkInRecord.employeeId,
      );
      const latestMs = Math.max(
        ...employeeRecords.map((item) => item.timestampServer?.toMillis() ?? 0),
      );

      if (employee && checkoutMs >= latestMs) {
        try {
          await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), {
            lastAction: 'check_out',
            lastTimestampServer: checkoutTimestamp,
          });
        } catch (employeeUpdateError) {
          console.warn('Check-out saved; employee status not updated:', employeeUpdateError);
        }
      }

      onClose();
    } catch (error) {
      console.error('Manual check-out failed:', error);
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: string }).code)
          : '';
      setError(
        code === 'permission-denied'
          ? 'Permission denied. Deploy updated Firestore rules (see firestore.rules).'
          : 'Could not save the check-out. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-checkout-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[90vh] w-[95%] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl md:w-full md:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="manual-checkout-title" className="text-lg font-semibold text-white">
            Add manual check-out
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-400">
          Close the open shift for{' '}
          <span className="font-medium text-zinc-200">
            {checkInRecord.employeeNameSnapshot}
          </span>
          . Check-in was on{' '}
          <span className="text-zinc-300">
            {formatRecordDate(checkInRecord.timestampServer)}{' '}
            {formatRecordTime(checkInRecord.timestampServer)}
          </span>
          .
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="checkout-date" className="mb-1.5 block text-sm text-zinc-400">
                Check-out date
              </label>
              <input
                id="checkout-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label htmlFor="checkout-time" className="mb-1.5 block text-sm text-zinc-400">
                Check-out time
              </label>
              <input
                id="checkout-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Hours will be calculated from check-in to this check-out. The employee&apos;s
            current kiosk status is only updated if this is their latest record.
          </p>

          {error && (
            <p className="text-center text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save check-out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
