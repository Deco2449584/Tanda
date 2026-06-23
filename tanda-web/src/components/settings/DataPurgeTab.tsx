'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  purgeOperationalData,
  type DataPurgeOptions,
  type DataPurgeResult,
} from '@/lib/admin/data-purge';

const CONFIRM_PHRASE = 'DELETE DATA';

interface DataPurgeTabProps {
  adminEmail: string;
}

const DEFAULT_OPTIONS: DataPurgeOptions = {
  attendanceRecords: true,
  attendanceStorage: true,
  shifts: false,
  leaveRequests: false,
  cargoInspections: false,
  cargoInspectionsStorage: false,
  portalClients: false,
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
      const purgeResult = await purgeOperationalData(options, (message) => {
        setProgressLog((prev) => [...prev.slice(-12), message]);
      });
      setResult(purgeResult);
      setConfirmText('');
    } catch (error) {
      setResult({
        attendanceRecordsDeleted: 0,
        storageFilesDeleted: 0,
        shiftsDeleted: 0,
        leaveRequestsDeleted: 0,
        cargoInspectionsDeleted: 0,
        cargoInspectionsStorageDeleted: 0,
        portalClientsDeleted: 0,
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
            Manual purge for testing or freeing space. Employees, avatars, and
            localization settings are kept. This cannot be undone.
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
              {result.shiftsDeleted > 0 ? (
                <p>Shifts removed: {result.shiftsDeleted}</p>
              ) : null}
              {result.leaveRequestsDeleted > 0 ? (
                <p>Leave requests removed: {result.leaveRequestsDeleted}</p>
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
