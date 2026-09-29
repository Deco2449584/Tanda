'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import { updateInspectionPortalAccess } from '@/lib/inspections/update-portal-access';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionPortalAccessProps {
  inspection: CargoInspection;
  onUpdated?: () => void;
}

export function InspectionPortalAccess({
  inspection,
  onUpdated,
}: InspectionPortalAccessProps) {
  const [portalEnabled, setPortalEnabled] = useState(inspection.portalEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const detectedClientId =
    inspection.clientLocationId?.trim() ||
    inspection.portalClientId?.trim() ||
    '';
  const detectedClientName =
    inspection.clientLocationName?.trim() ||
    (detectedClientId ? 'Assigned client' : '');
  const canToggle = Boolean(detectedClientId) && !saving;

  useEffect(() => {
    setPortalEnabled(inspection.portalEnabled);
  }, [inspection.portalEnabled]);

  async function handleToggle(nextEnabled: boolean) {
    if (!canToggle) return;

    setPortalEnabled(nextEnabled);
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (nextEnabled && !detectedClientId) {
        throw new Error(
          'This inspection has no client/site assigned. Register it again from Continental Inspect with a client selected.',
        );
      }

      await updateInspectionPortalAccess(inspection.id, {
        portalEnabled: nextEnabled,
        portalClientId: nextEnabled ? detectedClientId : undefined,
        awbNumber: inspection.awbNumber,
      });
      setMessage(
        nextEnabled
          ? 'Visible on the client portal.'
          : 'Hidden from the client portal.',
      );
      onUpdated?.();
    } catch (saveError) {
      setPortalEnabled(!nextEnabled);
      const text =
        saveError instanceof Error
          ? saveError.message
          : 'Could not update portal access.';
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Globe className="h-4 w-4 text-primary" aria-hidden />
            Client portal access
          </h2>
          <p className="mt-1 text-xs text-subtle">
            New inspections with a client are published to{' '}
            <Link
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              /portal
            </Link>{' '}
            by default. Turn this off only if the client should not see this record.
          </p>
        </div>
        <Link
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Open portal
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {detectedClientName ? (
          <p className="text-xs text-subtle">
            Client:{' '}
            <span className="font-medium text-foreground">{detectedClientName}</span>
          </p>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              No client/site on this inspection. Register it with a client in
              Continental Inspect before portal access can be enabled.
            </p>
          </div>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={portalEnabled}
          aria-busy={saving}
          disabled={!canToggle}
          onClick={() => void handleToggle(!portalEnabled)}
          className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
            portalEnabled
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-border bg-surface-base/50 hover:border-border-strong'
          }`}
        >
          <div className="min-w-0 flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                portalEnabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-zinc-700/60 text-zinc-400'
              }`}
            >
              {portalEnabled ? (
                <Eye className="h-4 w-4" aria-hidden />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                {portalEnabled ? 'Visible on client portal' : 'Hidden from client portal'}
              </p>
              <p className="mt-0.5 text-xs text-subtle">
                {portalEnabled
                  ? 'The client can open this inspection with AWB + PIN or their account.'
                  : 'This inspection stays internal until you enable portal access.'}
              </p>
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  portalEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600/40'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Saving
                  </>
                ) : portalEnabled ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Published
                  </>
                ) : (
                  'Not published'
                )}
              </span>
            </div>
          </div>

          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              portalEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                portalEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>

        {portalEnabled && detectedClientId ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-base/40 px-3.5 py-3 text-xs text-subtle">
            <p>
              AWB for portal lookup:{' '}
              <span className="font-mono text-muted">
                {inspection.awbNumber.trim()}
              </span>
            </p>
            <CopyAwbButton awbNumber={inspection.awbNumber} />
          </div>
        ) : null}

        {message ? (
          <p className="text-xs text-emerald-400">{message}</p>
        ) : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </section>
  );
}
