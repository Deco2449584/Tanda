'use client';

import Link from 'next/link';
import {
  ExternalLink,
  LayoutGrid,
  LogOut,
  Phone,
  CircleQuestionMark,
  ShieldCheck,
} from 'lucide-react';
import { INSPECT_BRAND } from '@/lib/inspect/brand';
import { useInspectSession } from '@/providers/InspectSessionProvider';

function ProfileRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-b border-border/60 py-3 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-semibold ${
          accent ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function InspectAccountScreen() {
  const { user, employee, isInspectAdmin, clients, signOutUser } =
    useInspectSession();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5">
      <h1 className="text-center font-display text-2xl font-normal tracking-wide text-foreground">
        Account
      </h1>
      <p className="mt-1 text-center text-[13px] text-muted">
        {INSPECT_BRAND.panelTitle} · {INSPECT_BRAND.operations}
      </p>

      <section className="mt-5 rounded-2xl border border-border bg-surface-raised px-4 py-2">
        <ProfileRow label="Name" value={employee?.name?.trim() || '—'} />
        <ProfileRow
          label="Employee ID"
          value={employee?.employeeId?.trim() || '—'}
        />
        <ProfileRow label="Department" value={employee?.department || '—'} />
        <ProfileRow label="Email" value={user.email || '—'} />
        <ProfileRow
          label="Access level"
          value={isInspectAdmin ? 'Administrator' : 'Operator'}
          accent
        />
        <ProfileRow
          label="Assigned clients"
          value={
            clients.length === 0
              ? 'None'
              : clients.map((client) => client.name).join(', ')
          }
        />
        <ProfileRow
          label="Status"
          value={employee?.active ? 'Active' : 'Inactive'}
        />
      </section>

      <div className="mt-4 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5 transition hover:bg-surface-hover"
        >
          <LayoutGrid className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Workspace
            </span>
            <span className="block text-xs text-subtle">
              Schedule, attendance, and leave
            </span>
          </span>
        </Link>

        {isInspectAdmin ? (
          <Link
            href="/inspections"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5 transition hover:bg-surface-hover"
          >
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                Inspections module
              </span>
              <span className="block text-xs text-subtle">
                Full admin view with portal access and editing
              </span>
            </span>
          </Link>
        ) : null}

        <a
          href={INSPECT_BRAND.supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5 transition hover:bg-surface-hover"
        >
          <CircleQuestionMark
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Help &amp; support
            </span>
            <span className="block text-xs text-subtle">
              {INSPECT_BRAND.supportUrlDisplay}
            </span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
        </a>

        <a
          href={`tel:${INSPECT_BRAND.phoneDial}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5 transition hover:bg-surface-hover"
        >
          <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Call support
            </span>
            <span className="block text-xs text-subtle">
              {INSPECT_BRAND.phone}
            </span>
          </span>
        </a>
      </div>

      <button
        type="button"
        onClick={() => void signOutUser()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/20"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
        {INSPECT_BRAND.license}
      </p>
    </div>
  );
}
