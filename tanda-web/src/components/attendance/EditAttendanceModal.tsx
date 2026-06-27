'use client';

import { FormEvent, useEffect, useState } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { Coffee, X } from 'lucide-react';
import { AttendanceMapLink } from '@/components/attendance/AttendanceMapLink';
import {
  formatAttendanceType,
  formatRecordDate,
  formatRecordTime,
  formValuesToTimestamp,
  timestampToFormValues,
} from '@/lib/attendance/format';
import { formatKioskLabel } from '@/lib/attendance/location-display';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord, AttendanceType } from '@/lib/types/attendance';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { Location } from '@/lib/types/location';

interface EditAttendanceModalProps {
  record: AttendanceRecord | null;
  locations: Location[];
  attendanceBreak: AttendanceBreakSettings;
  onClose: () => void;
}

export function EditAttendanceModal({
  record,
  locations,
  attendanceBreak,
  onClose,
}: EditAttendanceModalProps) {
  const [type, setType] = useState<AttendanceType>('check_in');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [breakWaived, setBreakWaived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeLocations = locations.filter((location) => location.active);

  useEffect(() => {
    if (!record) return;

    const formValues = timestampToFormValues(record.timestampServer);
    setType(record.type);
    setDate(formValues.date);
    setTime(formValues.time);
    setLocationId(record.locationId ?? '');
    setBreakWaived(record.breakWaived === true);
    setError('');
  }, [record]);

  if (!record) return null;

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!record || !db) {
      setError('Firebase is not available.');
      return;
    }

    if (!date || !time) {
      setError('Enter a valid date and time.');
      return;
    }

    const selectedLocation = activeLocations.find((item) => item.id === locationId);

    const payload: Record<string, unknown> = {
      type,
      timestampServer: formValuesToTimestamp(date, time),
      locationId: selectedLocation ? selectedLocation.id : deleteField(),
      locationNameSnapshot: selectedLocation ? selectedLocation.name : deleteField(),
      locationCitySnapshot: selectedLocation?.city ? selectedLocation.city : deleteField(),
    };

    if (type === 'check_out') {
      payload.breakWaived = breakWaived;
    } else {
      payload.breakWaived = deleteField();
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, COLLECTIONS.ATTENDANCE_RECORDS, record.id), payload);
      onClose();
    } catch {
      setError('Could not update the record.');
    } finally {
      setSaving(false);
    }
  }

  const kioskLabel = formatKioskLabel(record);

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

      <div className="relative z-10 max-h-[90vh] w-[95%] overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit record</h2>
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
          <span className="text-foreground">{record.employeeNameSnapshot}</span>
          {' · '}
          Current: {formatAttendanceType(record.type)} —{' '}
          {formatRecordDate(record.timestampServer)}{' '}
          {formatRecordTime(record.timestampServer)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="record-type" className="mb-1.5 block text-sm text-muted">
              Record type
            </label>
            <select
              id="record-type"
              value={type}
              onChange={(e) => setType(e.target.value as AttendanceType)}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="check_in">Check-in</option>
              <option value="check_out">Check-out</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="record-date" className="mb-1.5 block text-sm text-muted">
                Date
              </label>
              <input
                id="record-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="record-time" className="mb-1.5 block text-sm text-muted">
                Time
              </label>
              <input
                id="record-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="record-location" className="mb-1.5 block text-sm text-muted">
              Warehouse
            </label>
            <select
              id="record-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">No warehouse</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.city ? `${location.name} (${location.city})` : location.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'check_out' && attendanceBreak.enabled ? (
            <button
              type="button"
              role="switch"
              aria-checked={breakWaived}
              onClick={() => setBreakWaived((current) => !current)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                breakWaived
                  ? 'border-amber-500/40 bg-amber-950/25'
                  : 'border-border bg-surface-base/50 hover:border-border-strong'
              }`}
            >
              <span
                className={`mt-0.5 rounded-lg p-2 ${
                  breakWaived ? 'bg-amber-500/20 text-amber-300' : 'bg-surface-hover text-muted'
                }`}
              >
                <Coffee className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">
                  Employee did not take break
                </span>
                <span className="mt-0.5 block text-xs text-subtle">
                  {breakWaived
                    ? 'Unpaid break will not be deducted from this shift.'
                    : `A ${attendanceBreak.durationMinutes}-minute unpaid break applies if the shift is ${attendanceBreak.minShiftHours}h or longer.`}
                </span>
              </span>
              <span
                className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
                  breakWaived ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    breakWaived ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          ) : null}

          <div className="rounded-lg border border-border bg-surface-base/60 px-3 py-3 text-xs text-subtle">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-medium text-muted">Kiosk</span>
                <br />
                <span className="text-foreground">{kioskLabel}</span>
              </p>
              <p>
                <span className="font-medium text-muted">Source</span>
                <br />
                <span className="text-foreground">{record.source || '—'}</span>
              </p>
              <p>
                <span className="font-medium text-muted">Photo</span>
                <br />
                <span className="text-foreground">
                  {record.photoCaptured ? 'Captured' : 'Not captured'}
                </span>
              </p>
              <p>
                <span className="font-medium text-muted">Map</span>
                <br />
                <AttendanceMapLink record={record} />
              </p>
            </div>
          </div>

          {error ? (
            <p className="text-center text-xs text-red-500" role="alert">
              {error}
            </p>
          ) : null}

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
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
