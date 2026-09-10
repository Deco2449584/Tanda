'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  createEmptyPurgeResult,
  type DataPurgeOptions,
  type DataPurgeResult,
} from '@/lib/admin/data-purge';
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
  kioskLoginLogs: false,
  employeeDocumentsStorage: false,
  employeeCustomFieldValues: false,
  employeeCustomFields: false,
  issueReports: false,
  issueReportsStorage: false,
  helpTutorials: false,
  helpTutorialsStorage: false,
  accountingPeriodLocks: false,
  authSessions: false,
  auditLogs: false,
  resetEmployeePresence: true,
  clearEmployeeDocumentRefs: false,
  clearEmployeeLocationRefs: false,
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
      if (key === 'employeeDocumentsStorage' && next.employeeDocumentsStorage) {
        next.clearEmployeeDocumentRefs = true;
      }
      if (key === 'issueReports' && next.issueReports) {
        next.issueReportsStorage = true;
      }
      if (key === 'helpTutorials' && next.helpTutorials) {
        next.helpTutorialsStorage = true;
      }
      if ((key === 'locations' || key === 'locationGroups') && (next.locations || next.locationGroups)) {
        next.clearEmployeeLocationRefs = true;
      }
      if (key === 'employeeCustomFields' && next.employeeCustomFields) {
        next.employeeCustomFieldValues = true;
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
        ...createEmptyPurgeResult(),
        errors: [error instanceof Error ? error.message : 'Cleanup failed.'],
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
            Manual purge for testing or freeing space. Employee accounts, profile avatars,
            departments, access roles, and localization settings are kept. This cannot be
            undone.
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
          checked={options.issueReportsStorage}
          onChange={() => toggleOption('issueReportsStorage')}
          label="Issue report attachments (Storage)"
          hint="Photos under issue_reports/"
        />
        <OptionRow
          checked={options.issueReports}
          onChange={() => toggleOption('issueReports')}
          label="Issue reports (Firestore)"
          hint="Staff-reported problems and support tickets"
        />
        <OptionRow
          checked={options.helpTutorialsStorage}
          onChange={() => toggleOption('helpTutorialsStorage')}
          label="Help guide media (Storage)"
          hint="Videos, PDFs and docs under help_tutorials/"
        />
        <OptionRow
          checked={options.helpTutorials}
          onChange={() => toggleOption('helpTutorials')}
          label="Help guides (Firestore)"
          hint="In-app help centre tutorial and guide records"
        />
        <OptionRow
          checked={options.employeeDocumentsStorage}
          onChange={() => toggleOption('employeeDocumentsStorage')}
          label="Employee identity documents (Storage)"
          hint="Passport, visa, and custom field uploads under employee_documents/"
        />
        <OptionRow
          checked={options.clearEmployeeDocumentRefs}
          onChange={() => toggleOption('clearEmployeeDocumentRefs')}
          label="Clear passport / visa URL fields on employees"
          hint="Removes broken links after document storage is wiped"
        />
        <OptionRow
          checked={options.employeeCustomFieldValues}
          onChange={() => toggleOption('employeeCustomFieldValues')}
          label="Employee custom field values (Firestore)"
          hint="Per-employee answers for custom profile fields"
        />
        <OptionRow
          checked={options.employeeCustomFields}
          onChange={() => toggleOption('employeeCustomFields')}
          label="Employee custom field definitions (Firestore)"
          hint="Field schema — also selects values so answers are not orphaned"
        />
        <OptionRow
          checked={options.accountingPeriodLocks}
          onChange={() => toggleOption('accountingPeriodLocks')}
          label="Accounting period locks (Firestore)"
          hint="Closed pay-period locks used by payroll reporting"
        />
        <OptionRow
          checked={options.authSessions}
          onChange={() => toggleOption('authSessions')}
          label="Auth sessions (Firestore)"
          hint="Server session markers — users may need to sign in again"
        />
        <OptionRow
          checked={options.kioskLoginLogs}
          onChange={() => toggleOption('kioskLoginLogs')}
          label="Kiosk login logs (Firestore)"
          hint="Tablet sign-in history"
        />
        <OptionRow
          checked={options.kioskDevices}
          onChange={() => toggleOption('kioskDevices')}
          label="Legacy kiosk_devices collection (orphaned)"
          hint="Old tablet approval records. Kiosk access is now on employee accounts."
        />
        <OptionRow
          checked={options.locationGroups}
          onChange={() => toggleOption('locationGroups')}
          label="Location groups (Firestore)"
          hint="Multi-site groupings — also clears group refs on employees"
        />
        <OptionRow
          checked={options.locations}
          onChange={() => toggleOption('locations')}
          label="Locations / warehouses (Firestore)"
          hint="Site master data — also clears location refs on employees"
        />
        <OptionRow
          checked={options.clearEmployeeLocationRefs}
          onChange={() => toggleOption('clearEmployeeLocationRefs')}
          label="Clear location / group fields on employees"
          hint="Removes locationId and locationGroupId when sites are wiped"
        />
        <OptionRow
          checked={options.auditLogs}
          onChange={() => toggleOption('auditLogs')}
          label="Audit logs (Firestore)"
          hint="Master-only change history — use only for test resets"
        />
        <OptionRow
          checked={options.portalClients}
          onChange={() => toggleOption('portalClients')}
          label="Legacy portal_clients collection (orphaned)"
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
          {result ? <PurgeResultSummary result={result} /> : null}
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

function PurgeResultSummary({ result }: { result: DataPurgeResult }) {
  const lines: Array<[string, number]> = [
    ['Storage files removed', result.storageFilesDeleted],
    ['Attendance records removed', result.attendanceRecordsDeleted],
    ['Attendance justifications removed', result.attendanceJustificationsDeleted],
    ['Shifts removed', result.shiftsDeleted],
    ['Leave requests removed', result.leaveRequestsDeleted],
    ['Notifications removed', result.notificationsDeleted],
    ['Notification preferences removed', result.notificationPreferencesDeleted],
    ['Announcements removed', result.announcementsDeleted],
    ['Issue report attachments removed', result.issueReportsStorageDeleted],
    ['Issue reports removed', result.issueReportsDeleted],
    ['Help tutorial media removed', result.helpTutorialsStorageDeleted],
    ['Help tutorials removed', result.helpTutorialsDeleted],
    ['Employee documents removed', result.employeeDocumentsStorageDeleted],
    ['Employee document refs cleared', result.employeeDocumentRefsCleared],
    ['Custom field values removed', result.employeeCustomFieldValuesDeleted],
    ['Custom field definitions removed', result.employeeCustomFieldsDeleted],
    ['Accounting period locks removed', result.accountingPeriodLocksDeleted],
    ['Auth sessions removed', result.authSessionsDeleted],
    ['Inspection media removed', result.cargoInspectionsStorageDeleted],
    ['Cargo inspections removed', result.cargoInspectionsDeleted],
    ['Legacy portal clients removed', result.portalClientsDeleted],
    ['Kiosk login logs removed', result.kioskLoginLogsDeleted],
    ['Legacy kiosk devices removed', result.kioskDevicesDeleted],
    ['Location groups removed', result.locationGroupsDeleted],
    ['Locations removed', result.locationsDeleted],
    ['Employee location refs cleared', result.employeeLocationRefsCleared],
    ['Audit logs removed', result.auditLogsDeleted],
    ['Employees reset', result.employeesReset],
  ];

  return (
    <div className="mt-2 border-t border-border pt-2 text-muted">
      {lines.map(([label, count]) =>
        count > 0 ? (
          <p key={label}>
            {label}: {count}
          </p>
        ) : null,
      )}
      {result.errors.map((error) => (
        <p key={error} className="text-red-400">
          Error: {error}
        </p>
      ))}
    </div>
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
