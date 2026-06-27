'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { DataPurgeOptions, DataPurgeResult } from '@/lib/admin/data-purge';
import { auth } from '@/lib/firebase';

const CONFIRM_PHRASE = 'DELETE DATA';

interface DataPurgeTabProps {
  adminEmail: string;
}

const DEFAULT_OPTIONS: DataPurgeOptions = {
  attendanceRecords: true,
  attendanceStorage: true,
  attendanceJustifications: false,
  shifts: false,
  leaveRequests: false,
  notifications: false,
  notificationPreferences: false,
  announcements: false,
  cargoInspections: false,
  cargoInspectionsStorage: false,
  portalClients: false,
  locations: false,
  locationGroups: false,
  kioskDevices: false,
  employeeDocumentsStorage: false,
  resetEmployeePresence: true,
};

export function DataPurgeTab({ adminEmail }: DataPurgeTabProps) {
  const [options, setOptions] = useState<DataPurgeOptions>(DEFAULT_OPTIONS);
  const [confirmText, setConfirmText] = useState('');
  const [running, setRunning] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [result, setResult] = useState<DataPurgeResult | null>(null);

  const canRun = confirmText.trim() === CONFIRM_PHRASE && !running;

  function toggleOption(key: keyof DataPurgeOptions) {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'attendanceRecords' && next.attendanceRecords) {
        next.resetEmployeePresence = true;
      }
      if (key === 'cargoInspections' && next.cargoInspections) {
        next.cargoInspectionsStorage = true;
        next.portalClients = true;
      }
      if (key === 'cargoInspectionsStorage' && !next.cargoInspectionsStorage) {
        next.cargoInspections = false;
        next.portalClients = false;
      }
      if (key === 'portalClients' && !next.portalClients && next.cargoInspections) {
        next.cargoInspections = false;
        next.cargoInspectionsStorage = false;
      }
      return next;
    });
  }

  async function handlePurge() {
    if (!canRun) return;

    setRunning(true);
    setResult(null);
    setProgressLog(['Starting cleanup…']);

    try {
      const user = auth?.currentUser;
      if (!user) {
        throw new Error('You must be signed in to run cleanup.');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/data-purge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ options }),
      });

      const data = (await response.json()) as {
        result?: DataPurgeResult;
        progress?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Cleanup failed.');
      }

      if (data.progress?.length) {
        setProgressLog(['Starting cleanup…', ...data.progress]);
      }

      setResult(data.result ?? null);
      setConfirmText('');
    } catch (error) {
      setResult({
        attendanceRecordsDeleted: 0,
        storageFilesDeleted: 0,
        attendanceJustificationsDeleted: 0,
        shiftsDeleted: 0,
        leaveRequestsDeleted: 0,
        notificationsDeleted: 0,
        notificationPreferencesDeleted: 0,
        announcementsDeleted: 0,
        cargoInspectionsDeleted: 0,
        cargoInspectionsStorageDeleted: 0,
        portalClientsDeleted: 0,
        locationsDeleted: 0,
        locationGroupsDeleted: 0,
        kioskDevicesDeleted: 0,
        employeeDocumentsStorageDeleted: 0,
        employeesReset: 0,
        errors: [
          error instanceof Error ? error.message : 'Cleanup failed.',
        ],
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5 md:p-6">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Data cleanup</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Manual purge for testing or freeing space. Employee records, profile avatars,
            access roles, and localization settings are kept. This cannot be undone.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <OptionRow
          checked={options.attendanceStorage}
          onChange={() => toggleOption('attendanceStorage')}
          label="Attendance photos (Storage)"
          hint="Frees the most space — kiosk/tablet check-in images under attendance/"
        />
        <OptionRow
          checked={options.attendanceRecords}
          onChange={() => toggleOption('attendanceRecords')}
          label="Attendance records (Firestore)"
          hint="All check-in / check-out history"
        />
        <OptionRow
          checked={options.attendanceJustifications}
          onChange={() => toggleOption('attendanceJustifications')}
          label="Attendance justifications (Firestore)"
          hint="Late arrival notes and no-show explanations"
        />
        <OptionRow
          checked={options.resetEmployeePresence}
          onChange={() => toggleOption('resetEmployeePresence')}
          disabled={!options.attendanceRecords}
          label="Reset employee presence status"
          hint="Sets lastAction to none so kiosk state matches empty attendance"
        />
        <OptionRow
          checked={options.shifts}
          onChange={() => toggleOption('shifts')}
          label="Scheduled shifts"
          hint="Clears the roster / agenda"
        />
        <OptionRow
          checked={options.leaveRequests}
          onChange={() => toggleOption('leaveRequests')}
          label="Leave requests"
          hint="All pending, approved, and rejected requests"
        />
        <OptionRow
          checked={options.notifications}
          onChange={() => toggleOption('notifications')}
          label="In-app notifications (Firestore)"
          hint="Employee tray items and admin alert dismiss state"
        />
        <OptionRow
          checked={options.notificationPreferences}
          onChange={() => toggleOption('notificationPreferences')}
          label="Notification preferences (Firestore)"
          hint="Per-user channel toggles and dismissed admin alerts"
        />
        <OptionRow
          checked={options.announcements}
          onChange={() => toggleOption('announcements')}
          label="Announcements (Firestore)"
          hint="Broadcast messages sent to staff"
        />
        <OptionRow
          checked={options.employeeDocumentsStorage}
          onChange={() => toggleOption('employeeDocumentsStorage')}
          label="Employee identity documents (Storage)"
          hint="Passport and visa uploads under employee_documents/"
        />
        <OptionRow
          checked={options.kioskDevices}
          onChange={() => toggleOption('kioskDevices')}
          label="Kiosk devices (Firestore)"
          hint="Registered tablets and approval state — re-pair after purge"
        />
        <OptionRow
          checked={options.locationGroups}
          onChange={() => toggleOption('locationGroups')}
          label="Location groups (Firestore)"
          hint="Multi-site groupings — employees keep primary site assignments"
        />
        <OptionRow
          checked={options.locations}
          onChange={() => toggleOption('locations')}
          label="Locations / warehouses (Firestore)"
          hint="Site master data — also clears references on employees and kiosks"
        />
        <OptionRow
          checked={options.portalClients}
          onChange={() => toggleOption('portalClients')}
          label="Portal clients (Firestore)"
          hint="Registered forwarders / customs agencies with AWB + PIN access"
        />
        <OptionRow
          checked={options.cargoInspectionsStorage}
          onChange={() => toggleOption('cargoInspectionsStorage')}
          label="Cargo inspection media (Storage)"
          hint="Photos and videos under cargo_inspections/"
        />
        <OptionRow
          checked={options.cargoInspections}
          onChange={() => toggleOption('cargoInspections')}
          label="Cargo inspections (Firestore)"
          hint="All ULD / AWB records from Continental Inspect"
        />
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface-base/50 p-4">
        <p className="text-xs text-subtle">
          Signed in as <span className="text-muted">{adminEmail}</span>. Type{' '}
          <span className="font-mono font-semibold text-red-300">{CONFIRM_PHRASE}</span>{' '}
          to enable the button.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={running}
          placeholder={CONFIRM_PHRASE}
          className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-red-500/50 disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {(progressLog.length > 0 || result) && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-base/80 p-3 font-mono text-[11px] leading-relaxed text-subtle">
          {progressLog.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
          {result ? (
            <div className="mt-2 border-t border-border pt-2 text-muted">
              {result.storageFilesDeleted > 0 ? (
                <p>Storage files removed: {result.storageFilesDeleted}</p>
              ) : null}
              {result.attendanceRecordsDeleted > 0 ? (
                <p>Attendance records removed: {result.attendanceRecordsDeleted}</p>
              ) : null}
              {result.attendanceJustificationsDeleted > 0 ? (
                <p>
                  Attendance justifications removed: {result.attendanceJustificationsDeleted}
                </p>
              ) : null}
              {result.shiftsDeleted > 0 ? (
                <p>Shifts removed: {result.shiftsDeleted}</p>
              ) : null}
              {result.leaveRequestsDeleted > 0 ? (
                <p>Leave requests removed: {result.leaveRequestsDeleted}</p>
              ) : null}
              {result.notificationsDeleted > 0 ? (
                <p>Notifications removed: {result.notificationsDeleted}</p>
              ) : null}
              {result.notificationPreferencesDeleted > 0 ? (
                <p>
                  Notification preferences removed: {result.notificationPreferencesDeleted}
                </p>
              ) : null}
              {result.announcementsDeleted > 0 ? (
                <p>Announcements removed: {result.announcementsDeleted}</p>
              ) : null}
              {result.employeeDocumentsStorageDeleted > 0 ? (
                <p>
                  Employee documents removed: {result.employeeDocumentsStorageDeleted}
                </p>
              ) : null}
              {result.cargoInspectionsStorageDeleted > 0 ? (
                <p>
                  Inspection media removed: {result.cargoInspectionsStorageDeleted}
                </p>
              ) : null}
              {result.cargoInspectionsDeleted > 0 ? (
                <p>Cargo inspections removed: {result.cargoInspectionsDeleted}</p>
              ) : null}
              {result.portalClientsDeleted > 0 ? (
                <p>Portal clients removed: {result.portalClientsDeleted}</p>
              ) : null}
              {result.kioskDevicesDeleted > 0 ? (
                <p>Kiosk devices removed: {result.kioskDevicesDeleted}</p>
              ) : null}
              {result.locationGroupsDeleted > 0 ? (
                <p>Location groups removed: {result.locationGroupsDeleted}</p>
              ) : null}
              {result.locationsDeleted > 0 ? (
                <p>Locations removed: {result.locationsDeleted}</p>
              ) : null}
              {result.employeesReset > 0 ? (
                <p>Employees reset: {result.employeesReset}</p>
              ) : null}
              {result.errors.map((error) => (
                <p key={error} className="text-red-400">
                  Error: {error}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handlePurge()}
        disabled={!canRun}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cleaning…
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Run selected cleanup
          </>
        )}
      </button>
    </section>
  );
}

function OptionRow({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border border-border/80 bg-surface-base/40 px-3 py-2.5 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-border-strong'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-surface-raised text-primary focus:ring-primary/40"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-subtle">{hint}</span>
      </span>
    </label>
  );
}
