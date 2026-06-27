'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { createAttendanceRecordRequest } from '@/lib/attendance/attendance-records-api';
import {
  formatRecordDate,
  formatRecordTime,
  formValuesToTimestamp,
  timestampToFormValues,
} from '@/lib/attendance/format';
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

    if (!checkInRecord || !employee) {
      setError('Employee record not found.');
      return;
    }

    const employeeRecords = allRecords.filter(
      (item) => item.employeeId === checkInRecord.employeeId,
    );
    const latestMs = Math.max(
      ...employeeRecords.map((item) => item.timestampServer?.toMillis() ?? 0),
      0,
    );

    setSaving(true);

    try {
      await createAttendanceRecordRequest({
        employeeDocId: employee.id,
        type: 'check_out',
        timestampMs: checkoutMs,
        source: 'web-admin-manual-checkout',
        breakWaived: false,
        syncEmployeePresence: employee != null && checkoutMs >= latestMs,
      });

      onClose();
    } catch (submitError) {
      console.error('Manual check-out failed:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
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

      <div className="relative z-10 max-h-[90vh] w-[95%] overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="manual-checkout-title" className="text-lg font-semibold text-white">
            Add manual check-out
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted">
          Close the open shift for{' '}
          <span className="font-medium text-foreground">
            {checkInRecord.employeeNameSnapshot}
          </span>
          . Check-in was on{' '}
          <span className="text-muted">
            {formatRecordDate(checkInRecord.timestampServer)}{' '}
            {formatRecordTime(checkInRecord.timestampServer)}
          </span>
          .
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="checkout-date" className="mb-1.5 block text-sm text-muted">
                Check-out date
              </label>
              <input
                id="checkout-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="checkout-time" className="mb-1.5 block text-sm text-muted">
                Check-out time
              </label>
              <input
                id="checkout-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <p className="text-xs text-subtle">
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
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm text-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white hover:opacity-90 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save check-out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
