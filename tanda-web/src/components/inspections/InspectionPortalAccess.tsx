'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    setPortalEnabled(inspection.portalEnabled);
  }, [inspection.portalEnabled]);

  async function handleToggle(nextEnabled: boolean) {
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
          ? 'Portal enabled for the assigned client.'
          : 'Portal access disabled.',
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
            Clients track this shipment at{' '}
            <Link
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              /portal
            </Link>{' '}
            with AWB {inspection.awbNumber} and their company PIN.
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
            {' '}(detected from the inspection — not selectable)
          </p>
        ) : (
          <p className="text-xs text-amber-400">
            No client/site on this inspection. It must be registered with a client in
            Continental Inspect before portal access can be enabled.
          </p>
        )}

        <label
          className={`flex items-center gap-3 ${
            !detectedClientId || saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            checked={portalEnabled}
            disabled={!detectedClientId || saving}
            onChange={(e) => void handleToggle(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-surface-raised text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-foreground">
            Enable portal for this inspection
          </span>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden />
          ) : null}
        </label>

        {portalEnabled && detectedClientId ? (
          <p className="text-xs text-subtle">
            AWB for portal lookup:{' '}
            <span className="font-mono text-muted">
              {inspection.awbNumber.trim()}
            </span>{' '}
            (with or without dashes when logging in)
          </p>
        ) : null}

        {message ? (
          <p className="text-xs text-emerald-400">{message}</p>
        ) : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </section>
  );
}
