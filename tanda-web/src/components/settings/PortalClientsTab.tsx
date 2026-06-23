'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  createPortalClient,
  deletePortalClient,
  regeneratePortalClientPin,
  setPortalClientActive,
  subscribePortalClients,
} from '@/lib/portal/portal-clients-service';
import { generatePortalPin, validatePortalPinFormat } from '@/lib/portal/pin';
import type { PortalClient } from '@/lib/types/portal-client';

interface PortalClientsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export function PortalClientsTab({ onToast }: PortalClientsTabProps) {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [pin, setPin] = useState(() => generatePortalPin());
  const [saving, setSaving] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePortalClients(
      (data) => {
        setClients(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
        onToast('Could not load portal clients.', 'error');
      },
    );

    return () => unsubscribe();
  }, [onToast]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setRevealedPin(null);

    const pinError = validatePortalPinFormat(pin);
    if (pinError) {
      onToast(pinError, 'error');
      setSaving(false);
      return;
    }

    try {
      const result = await createPortalClient({ companyName, accessCode, pin });
      setRevealedPin(result.pin);
      setCompanyName('');
      setAccessCode('');
      setPin(generatePortalPin());
      onToast(`Client created. Share PIN with ${result.clientId ? 'the forwarder' : 'client'}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create client.';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegeneratePin(client: PortalClient) {
    setRegeneratingId(client.id);
    setRevealedPin(null);

    try {
      const newPin = await regeneratePortalClientPin(client.id);
      setRevealedPin(newPin);
      onToast(`New PIN generated for ${client.companyName}.`);
    } catch {
      onToast('Could not regenerate PIN.', 'error');
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleToggleActive(client: PortalClient) {
    try {
      await setPortalClientActive(client.id, !client.active);
      onToast(
        client.active
          ? `${client.companyName} deactivated.`
          : `${client.companyName} activated.`,
      );
    } catch {
      onToast('Could not update client status.', 'error');
    }
  }

  async function handleDelete(client: PortalClient) {
    const confirmed = window.confirm(
      `Delete "${client.companyName}" permanently?\n\nInspections assigned to this client will lose portal access. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(client.id);

    try {
      const detachedCount = await deletePortalClient(client.id);
      onToast(
        detachedCount > 0
          ? `${client.companyName} deleted. Portal access removed from ${detachedCount} inspection(s).`
          : `${client.companyName} deleted.`,
      );
    } catch {
      onToast('Could not delete client.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function copyPortalLink() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/portal`
        : '/portal';
    void navigator.clipboard.writeText(url);
    onToast('Portal link copied.');
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">Client portal (Suite 04)</h2>
        <p className="mt-2 text-sm text-muted">
          Forwarders and customs agencies access{' '}
          <button
            type="button"
            onClick={copyPortalLink}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            /portal
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>{' '}
          with AWB + company PIN.
        </p>
      </section>

      {revealedPin ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3">
          <p className="text-sm font-semibold text-amber-200">PIN (copy now)</p>
          <p className="mt-1 font-mono text-2xl tracking-widest text-white">
            {revealedPin}
          </p>
          <p className="mt-2 text-xs text-amber-200/80">
            This PIN is shown only once. Store it securely before closing.
          </p>
          <p className="mt-2 text-xs text-muted">
            Then open an inspection, enable portal access, and assign this client
            before testing at /portal.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">New portal client</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Company name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Access code
              </label>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="FWD-ACME"
                required
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                PIN (6–8 digits)
              </label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                inputMode="numeric"
                required
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? 'Creating…' : 'Create client'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">Registered clients</h3>
        {loading ? (
          <p className="mt-4 text-sm text-subtle">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="mt-4 text-sm text-subtle">No portal clients yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {clients.map((client) => (
              <li
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-white">{client.companyName}</p>
                  <p className="text-xs text-subtle">Code: {client.accessCode}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      client.active
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-700 text-muted'
                    }`}
                  >
                    {client.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRegeneratePin(client)}
                    disabled={regeneratingId === client.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${regeneratingId === client.id ? 'animate-spin' : ''}`}
                      aria-hidden
                    />
                    New PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(client)}
                    className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500"
                  >
                    {client.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(client)}
                    disabled={deletingId === client.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-700 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                    {deletingId === client.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
