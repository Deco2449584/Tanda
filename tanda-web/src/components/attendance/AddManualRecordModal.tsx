'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { createAttendanceRecordRequest, AttendanceRestrictionError } from '@/lib/attendance/attendance-records-api';
import { formValuesToTimestamp } from '@/lib/attendance/format';
import { captureCurrentPosition } from '@/lib/geo/capture-position';
import type { AttendanceRecord, AttendanceType } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

interface AddManualRecordModalProps {
  open: boolean;
  employees: Employee[];
  locations: Location[];
  allRecords: AttendanceRecord[];
  onClose: () => void;
}

export function AddManualRecordModal({
  open,
  employees,
  locations,
  allRecords,
  onClose,
}: AddManualRecordModalProps) {
  const [employeeDocId, setEmployeeDocId] = useState('');
  const [type, setType] = useState<AttendanceType>('check_in');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geoAccuracy, setGeoAccuracy] = useState('');
  const [geoAddress, setGeoAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [capturingGeo, setCapturingGeo] = useState(false);
  const [error, setError] = useState('');

  const activeEmployees = employees.filter((employee) => employee.active);
  const activeLocations = locations.filter((location) => location.active);

  useEffect(() => {
    if (!open) return;

    const now = new Date();
    setEmployeeDocId('');
    setType('check_in');
    setDate(now.toISOString().slice(0, 10));
    setTime(now.toTimeString().slice(0, 5));
    setLocationId('');
    setLatitude('');
    setLongitude('');
    setGeoAccuracy('');
    setGeoAddress('');
    setError('');
  }, [open]);

  if (!open) return null;

  function handleClose() {
    if (saving) return;
    onClose();
  }

  function parseOptionalNumber(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function handleUseCurrentLocation() {
    setCapturingGeo(true);
    try {
      const geo = await captureCurrentPosition();
      if (!geo) {
        setError('Could not capture current location.');
        return;
      }

      setLatitude(String(geo.latitude));
      setLongitude(String(geo.longitude));
      setGeoAccuracy(geo.accuracy != null ? String(geo.accuracy) : '');
      setError('');
    } finally {
      setCapturingGeo(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const employee = activeEmployees.find((item) => item.id === employeeDocId);
    if (!employee) {
      setError('Select an employee.');
      return;
    }

    if (!date || !time) {
      setError('Enter a valid date and time.');
      return;
    }

    setSaving(true);

    try {
      await saveManualRecord(false);
      onClose();
    } catch (submitError) {
      console.error('Manual record failed:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not save the record.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveManualRecord(overrideRestrictions: boolean) {
    const employee = activeEmployees.find((item) => item.id === employeeDocId);
    if (!employee || !date || !time) {
      throw new Error('Missing employee or time.');
    }

    const timestampServer = formValuesToTimestamp(date, time);
    const timestampMs = timestampServer.toMillis();
    const selectedLocation = activeLocations.find((item) => item.id === locationId);
    const parsedLatitude = parseOptionalNumber(latitude);
    const parsedLongitude = parseOptionalNumber(longitude);
    const parsedAccuracy = parseOptionalNumber(geoAccuracy);

    const employeeRecords = allRecords.filter(
      (item) => item.employeeId === employee.employeeId,
    );
    const latestMs = Math.max(
      ...employeeRecords.map((item) => item.timestampServer?.toMillis() ?? 0),
      0,
    );

    try {
      await createAttendanceRecordRequest({
        employeeDocId: employee.id,
        type,
        timestampMs,
        source: 'web-admin-manual',
        locationId: selectedLocation?.id ?? null,
        locationNameSnapshot: selectedLocation?.name ?? null,
        locationCitySnapshot: selectedLocation?.city ?? null,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        geoAccuracy: parsedAccuracy,
        geoAddress: geoAddress.trim() || undefined,
        breakWaived: type === 'check_out' ? false : undefined,
        syncEmployeePresence: timestampMs >= latestMs,
        overrideRestrictions,
      });
    } catch (error) {
      if (
        !overrideRestrictions &&
        type === 'check_in' &&
        error instanceof AttendanceRestrictionError
      ) {
        const confirmed = window.confirm(
          `${error.message}\n\nSave this manual check-in anyway? This override will be logged.`,
        );
        if (confirmed) {
          await saveManualRecord(true);
          return;
        }
      }

      throw error;
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

      <div className="relative z-10 max-h-[90vh] w-[95%] overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add manual record</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="manual-employee" className="mb-1.5 block text-sm text-muted">
              Employee
            </label>
            <select
              id="manual-employee"
              required
              value={employeeDocId}
              onChange={(e) => setEmployeeDocId(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Select employee…</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual-type" className="mb-1.5 block text-sm text-muted">
              Record type
            </label>
            <select
              id="manual-type"
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
              <label htmlFor="manual-date" className="mb-1.5 block text-sm text-muted">
                Date
              </label>
              <input
                id="manual-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="manual-time" className="mb-1.5 block text-sm text-muted">
                Time
              </label>
              <input
                id="manual-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="manual-location" className="mb-1.5 block text-sm text-muted">
              Warehouse
            </label>
            <select
              id="manual-location"
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

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">GPS (optional)</p>
            <button
              type="button"
              onClick={() => void handleUseCurrentLocation()}
              disabled={capturingGeo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs text-muted hover:bg-surface-hover disabled:opacity-50"
            >
              <MapPin className="h-3.5 w-3.5" />
              {capturingGeo ? 'Capturing…' : 'Use current location'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <input
            type="text"
            inputMode="decimal"
            placeholder="GPS accuracy (m)"
            value={geoAccuracy}
            onChange={(e) => setGeoAccuracy(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />

          <textarea
            rows={2}
            placeholder="Exact location (optional)"
            value={geoAddress}
            onChange={(e) => setGeoAddress(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />

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
              {saving ? 'Saving...' : 'Save record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
