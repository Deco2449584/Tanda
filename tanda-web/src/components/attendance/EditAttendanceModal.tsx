'use client';

import { FormEvent, useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { X } from 'lucide-react';
import {
  formatAttendanceType,
  formatRecordDate,
  formatRecordTime,
  formValuesToTimestamp,
  timestampToFormValues,
} from '@/lib/attendance/format';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord, AttendanceType } from '@/lib/types/attendance';

interface EditAttendanceModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export function EditAttendanceModal({ record, onClose }: EditAttendanceModalProps) {
  const [type, setType] = useState<AttendanceType>('check_in');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record) {
      const formValues = timestampToFormValues(record.timestampServer);
      setType(record.type);
      setDate(formValues.date);
      setTime(formValues.time);
      setError('');
    }
  }, [record]);

  if (!record) return null;

  function handleClose() {
    if (saving) return;
    onClose();
  }

  function hasChanges(): boolean {
    if (!record) return false;

    const newTimestamp = formValuesToTimestamp(date, time);
    const originalMs = record.timestampServer?.toMillis() ?? null;
    const newMs = newTimestamp.toMillis();

    return type !== record.type || originalMs !== newMs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!record) return;

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (!date || !time) {
      setError('Enter a valid date and time.');
      return;
    }

    if (!hasChanges()) {
      onClose();
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, COLLECTIONS.ATTENDANCE_RECORDS, record.id), {
        type,
        timestampServer: formValuesToTimestamp(date, time),
      });
      onClose();
    } catch {
      setError('Could not update the record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={handleClose}
      />

      <div className="relative z-10 w-[95%] rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl md:w-full md:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit record</h2>
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
          <span className="text-zinc-200">{record.employeeNameSnapshot}</span>
          {' · '}
          Current: {formatAttendanceType(record.type)} —{' '}
          {formatRecordDate(record.timestampServer)}{' '}
          {formatRecordTime(record.timestampServer)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="record-type" className="mb-1.5 block text-sm text-zinc-400">
              Record type
            </label>
            <select
              id="record-type"
              value={type}
              onChange={(e) => setType(e.target.value as AttendanceType)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            >
              <option value="check_in">Check-in</option>
              <option value="check_out">Check-out</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="record-date" className="mb-1.5 block text-sm text-zinc-400">
                Date
              </label>
              <input
                id="record-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="record-time" className="mb-1.5 block text-sm text-zinc-400">
                Time
              </label>
              <input
                id="record-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

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
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
