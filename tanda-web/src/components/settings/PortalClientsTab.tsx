'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import {
  createPortalClient,
  deletePortalClient,
  regeneratePortalClientPin,
  setPortalClientActive,
  subscribePortalClients,
} from '@/lib/portal/portal-clients-service';
import {
  generateUniquePortalPinFromList,
  isPortalPinTaken,
  validatePortalPinFormat,
} from '@/lib/portal/pin';
import type { PortalClient } from '@/lib/types/portal-client';

interface PortalClientsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

function PinCopyButton({
  pin,
  onCopied,
  label = 'Copy PIN',
}: {
  pin: string;
  onCopied: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(pin);
        onCopied();
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary"
      aria-label={label}
      title={label}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
      Copy
    </button>
  );
}

export function PortalClientsTab({ onToast }: PortalClientsTabProps) {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const takenPins = useMemo(
    () => clients.map((client) => client.pin).filter((value): value is string => Boolean(value)),
    [clients],
  );

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

  function handleGeneratePin() {
    try {
      const nextPin = generateUniquePortalPinFromList(takenPins);
      setPin(nextPin);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not generate PIN.';
      onToast(message, 'error');
    }
  }

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

    if (isPortalPinTaken(pin, clients)) {
      onToast('This PIN is already in use by another client.', 'error');
      setSaving(false);
      return;
    }

    try {
      const result = await createPortalClient({ companyName, accessCode, pin });
      setRevealedPin(result.pin);
      setCompanyName('');
      setAccessCode('');
      setPin('');
      onToast(`Client created. Share the PIN with ${result.clientId ? 'the forwarder' : 'the client'}.`);
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

  const pinTakenInForm =
    pin.trim().length > 0 && isPortalPinTaken(pin, clients);

  return (
    <div className="min-w-0 space-y-8">
      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">Client portal (Suite 04)</h2>
        <p className="mt-2 text-sm text-muted">
          Each forwarder or customs agency has its own PIN. They sign in at{' '}
          <button
            type="button"
            onClick={copyPortalLink}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            /portal
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>{' '}
          with the shipment AWB and their company PIN. PINs do not expire unless
          you generate a new one or deactivate the client.
        </p>
      </section>

      {revealedPin ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">PIN (copy now)</p>
              <p className="mt-1 font-mono text-2xl tracking-widest text-white">
                {revealedPin}
              </p>
            </div>
            <PinCopyButton
              pin={revealedPin}
              onCopied={() => onToast('PIN copied.')}
              label="Copy new PIN"
            />
          </div>
          <p className="mt-2 text-xs text-amber-200/80">
            Share this PIN with the client. It also appears on their card below.
          </p>
          <p className="mt-2 text-xs text-muted">
            Then open an inspection, enable portal access, and assign this client
            before testing at /portal.
          </p>
        </div>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">New portal client</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 min-w-0 space-y-4">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted">
              Company name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                Access code
              </label>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="FWD-ACME"
                required
                className="w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                PIN (6–8 digits)
              </label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  inputMode="numeric"
                  placeholder="Enter or generate"
                  required
                  className="w-full min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={handleGeneratePin}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-xs font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary sm:w-auto"
                  title="Generate unique PIN"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Generate PIN
                </button>
              </div>
              {pinTakenInForm ? (
                <p className="mt-1 text-xs text-amber-300">
                  This PIN is already used by another client.
                </p>
              ) : (
                <p className="mt-1 text-xs text-subtle">
                  Leave blank and use Generate, or type your own PIN.
                </p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || pinTakenInForm || !pin.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? 'Creating…' : 'Create client'}
          </button>
        </form>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">Registered clients</h3>
        {loading ? (
          <LoadingIndicator />
        ) : clients.length === 0 ? (
          <p className="mt-4 text-sm text-subtle">No portal clients yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {clients.map((client) => (
              <li
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">{client.companyName}</p>
                  <p className="text-xs text-subtle">Code: {client.accessCode}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">PIN:</span>
                    {client.pin ? (
                      <>
                        <span className="font-mono text-sm tracking-wider text-white">
                          {client.pin}
                        </span>
                        <PinCopyButton
                          pin={client.pin}
                          onCopied={() => onToast(`PIN copied for ${client.companyName}.`)}
                          label={`Copy PIN for ${client.companyName}`}
                        />
                      </>
                    ) : (
                      <span className="text-xs text-subtle">
                        Unknown — use New PIN to set one
                      </span>
                    )}
                  </div>
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
