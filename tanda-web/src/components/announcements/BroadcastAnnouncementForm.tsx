'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { broadcastAnnouncementRequest } from '@/lib/announcements/announcement-api';
import type { AnnouncementAudience } from '@/lib/types/announcement';
import type { Employee } from '@/lib/types/employee';
import { useDepartments } from '@/providers/DepartmentsProvider';
import type { Location } from '@/lib/types/location';

interface BroadcastAnnouncementFormProps {
  employees: Employee[];
  locations: Location[];
  adminName?: string;
  onSent: () => void;
  onError: (message: string) => void;
}

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: 'all', label: 'All active employees' },
  { value: 'department', label: 'By department' },
  { value: 'location', label: 'By location' },
  { value: 'selected', label: 'Selected employees' },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEligibleRecipient(employee: Employee): boolean {
  return employee.active !== false && Boolean(employee.email?.trim());
}

export function BroadcastAnnouncementForm({
  employees,
  locations,
  adminName,
  onSent,
  onError,
}: BroadcastAnnouncementFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [audienceValue, setAudienceValue] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { departmentNames } = useDepartments();

  const eligibleEmployees = useMemo(
    () => employees.filter(isEligibleRecipient),
    [employees],
  );

  const departments = useMemo(() => {
    const values = new Set(departmentNames);
    employees.forEach((employee) => {
      const department = employee.department?.trim();
      if (department) values.add(department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [departmentNames, employees]);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return eligibleEmployees;

    return eligibleEmployees.filter((employee) => {
      const haystack = [
        employee.name,
        employee.email,
        employee.employeeId,
        employee.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [eligibleEmployees, employeeSearch]);

  const recipientCount = useMemo(() => {
    if (audience === 'selected') {
      return selectedEmails.length;
    }

    return eligibleEmployees.filter((employee) => {
      if (audience === 'department') {
        return employee.department?.trim() === audienceValue.trim();
      }
      if (audience === 'location') {
        return employee.locationId?.trim() === audienceValue.trim();
      }
      return true;
    }).length;
  }, [audience, audienceValue, eligibleEmployees, selectedEmails.length]);

  function toggleEmployee(email: string) {
    const normalized = normalizeEmail(email);
    setSelectedEmails((current) =>
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized],
    );
  }

  function selectVisibleEmployees() {
    const visibleEmails = filteredEmployees.map((employee) =>
      normalizeEmail(employee.email),
    );
    setSelectedEmails((current) => Array.from(new Set([...current, ...visibleEmails])));
  }

  function clearSelectedEmployees() {
    setSelectedEmails([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !body.trim()) {
      onError('Title and message are required.');
      return;
    }

    if ((audience === 'department' || audience === 'location') && !audienceValue.trim()) {
      onError('Select a department or location.');
      return;
    }

    if (audience === 'selected' && selectedEmails.length === 0) {
      onError('Select at least one employee.');
      return;
    }

    if (recipientCount === 0) {
      onError('No active employees match this audience.');
      return;
    }

    setSubmitting(true);

    try {
      await broadcastAnnouncementRequest({
        payload: {
          title: title.trim(),
          body: body.trim(),
          audience,
          audienceValue: audienceValue.trim() || undefined,
          recipientEmails: audience === 'selected' ? selectedEmails : undefined,
        },
        createdByName: adminName,
      });

      setTitle('');
      setBody('');
      setAudience('all');
      setAudienceValue('');
      setSelectedEmails([]);
      setEmployeeSearch('');
      onSent();
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Could not send announcement.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">New announcement</h2>
          <p className="mt-1 text-xs text-subtle">
            Sends an in-app notification to each recipient, a branded email when Resend
            is configured, and push alerts when enabled on their device.
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="announcement-title" className="mb-1.5 block text-sm text-muted">
            Subject
          </label>
          <input
            id="announcement-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Warehouse closure this Friday"
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label htmlFor="announcement-body" className="mb-1.5 block text-sm text-muted">
            Message
          </label>
          <textarea
            id="announcement-body"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            placeholder="Write the announcement employees should receive…"
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="announcement-audience" className="mb-1.5 block text-sm text-muted">
              Audience
            </label>
            <select
              id="announcement-audience"
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value as AnnouncementAudience);
                setAudienceValue('');
                setSelectedEmails([]);
                setEmployeeSearch('');
              }}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            >
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {audience === 'department' ? (
            <div>
              <label htmlFor="announcement-department" className="mb-1.5 block text-sm text-muted">
                Department
              </label>
              <select
                id="announcement-department"
                value={audienceValue}
                onChange={(event) => setAudienceValue(event.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Select department…</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {audience === 'location' ? (
            <div>
              <label htmlFor="announcement-location" className="mb-1.5 block text-sm text-muted">
                Location
              </label>
              <select
                id="announcement-location"
                value={audienceValue}
                onChange={(event) => setAudienceValue(event.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Select location…</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {audience === 'selected' ? (
          <div className="rounded-xl border border-border bg-surface-base/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="announcement-employee-search" className="text-sm text-muted">
                Choose recipients
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectVisibleEmployees}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition hover:bg-surface-hover"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={clearSelectedEmployees}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:bg-surface-hover hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>

            <input
              id="announcement-employee-search"
              type="search"
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              placeholder="Search by name, email, or ID…"
              className="mt-3 w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />

            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border/80 bg-surface-base p-2">
              {filteredEmployees.length === 0 ? (
                <li className="px-2 py-3 text-sm text-subtle">No employees match this search.</li>
              ) : (
                filteredEmployees.map((employee) => {
                  const email = normalizeEmail(employee.email);
                  const checked = selectedEmails.includes(email);

                  return (
                    <li key={employee.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 transition hover:bg-surface-hover">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEmployee(employee.email)}
                          className="mt-0.5 h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {employee.name}
                          </span>
                          <span className="block truncate text-xs text-subtle">
                            {employee.employeeId} · {employee.email}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>

            <p className="mt-2 text-xs text-subtle">
              {selectedEmails.length} employee{selectedEmails.length === 1 ? '' : 's'} selected
            </p>
          </div>
        ) : null}

        <p className="rounded-lg border border-border/80 bg-surface-base/40 px-3 py-2 text-xs text-subtle">
          {recipientCount} active employee{recipientCount === 1 ? '' : 's'} will receive
          this announcement.
        </p>

        <button
          type="submit"
          disabled={submitting || recipientCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Sending…' : 'Send announcement'}
        </button>
      </form>
    </section>
  );
}
