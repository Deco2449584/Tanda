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
];

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
  const [submitting, setSubmitting] = useState(false);

  const { departmentNames } = useDepartments();

  const departments = useMemo(() => {
    const values = new Set(departmentNames);
    employees.forEach((employee) => {
      const department = employee.department?.trim();
      if (department) values.add(department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [departmentNames, employees]);

  const recipientCount = useMemo(() => {
    return employees.filter((employee) => {
      if (employee.active === false) return false;
      if (!employee.email?.trim()) return false;
      if (audience === 'department') {
        return employee.department?.trim() === audienceValue.trim();
      }
      if (audience === 'location') {
        return employee.locationId?.trim() === audienceValue.trim();
      }
      return true;
    }).length;
  }, [audience, audienceValue, employees]);

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
        },
        createdByName: adminName,
      });

      setTitle('');
      setBody('');
      setAudience('all');
      setAudienceValue('');
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
