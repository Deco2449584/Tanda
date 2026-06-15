'use client';

import { useEffect, useState } from 'react';
import { Copy, Globe, Loader2 } from 'lucide-react';
import { updateInspectionPortalAccess } from '@/lib/inspections/update-portal-access';
import { subscribePortalClients } from '@/lib/portal/portal-clients-service';
import type { CargoInspection } from '@/lib/types/cargo-inspection';
import type { PortalClient } from '@/lib/types/portal-client';

interface InspectionPortalAccessProps {
  inspection: CargoInspection;
  onUpdated?: () => void;
}

export function InspectionPortalAccess({
  inspection,
  onUpdated,
}: InspectionPortalAccessProps) {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [portalEnabled, setPortalEnabled] = useState(inspection.portalEnabled);
  const [portalClientId, setPortalClientId] = useState(
    inspection.portalClientId ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPortalEnabled(inspection.portalEnabled);
    setPortalClientId(inspection.portalClientId ?? '');
  }, [inspection.portalClientId, inspection.portalEnabled]);

  useEffect(() => {
    const unsubscribe = subscribePortalClients(setClients);
    return () => unsubscribe();
  }, []);

  const activeClients = clients.filter((client) => client.active);

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateInspectionPortalAccess(inspection.id, {
        portalEnabled,
        portalClientId: portalEnabled ? portalClientId : undefined,
        awbNumber: inspection.awbNumber,
      });
      setMessage('Portal access updated.');
      onUpdated?.();
    } catch (saveError) {
      const text =
        saveError instanceof Error
          ? saveError.message
          : 'Could not update portal access.';
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  function copyPortalLink() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/portal`
        : '/portal';
    void navigator.clipboard.writeText(url);
    setMessage('Portal link copied to clipboard.');
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Globe className="h-4 w-4 text-primary" aria-hidden />
            Client portal access
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Clients track this shipment at /portal with AWB {inspection.awbNumber}{' '}
            and their company PIN.
          </p>
        </div>
        <button
          type="button"
          onClick={copyPortalLink}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy portal link
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={portalEnabled}
            onChange={(e) => setPortalEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-zinc-200">Enable portal for this inspection</span>
        </label>

        {portalEnabled ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Portal client (forwarder)
            </label>
            <select
              value={portalClientId}
              onChange={(e) => setPortalClientId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
            >
              <option value="">Select a client…</option>
              {activeClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName} ({client.accessCode})
                </option>
              ))}
            </select>
            {activeClients.length === 0 ? (
              <p className="mt-2 text-xs text-amber-400">
                Create portal clients in Settings → Portal clients first.
              </p>
            ) : null}
          </div>
        ) : null}

        {portalEnabled && portalClientId ? (
          <p className="text-xs text-zinc-500">
            AWB for portal lookup:{' '}
            <span className="font-mono text-zinc-300">
              {inspection.awbNumber.trim()}
            </span>
            {' '}(with or without dashes when logging in)
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Save portal settings
        </button>

        {message ? (
          <p className="text-xs text-emerald-400">{message}</p>
        ) : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </section>
  );
}
