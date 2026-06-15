'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, PackageSearch } from 'lucide-react';
import { verifyPortalAccess } from '@/lib/portal/client-api';
import { savePortalSession } from '@/lib/portal/client-session';

export default function PortalLoginPage() {
  const router = useRouter();
  const [awbNumber, setAwbNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyPortalAccess(awbNumber, pin);
      savePortalSession(result.token, result.awbNumber);
      router.push('/portal/track');
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo validar el acceso.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <PackageSearch className="h-7 w-7 text-emerald-700" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Rastreo de carga</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Ingrese su número de guía (AWB) y el PIN de su empresa para ver el
            estado de la inspección en vivo.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="awb"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Número AWB
            </label>
            <input
              id="awb"
              type="text"
              value={awbNumber}
              onChange={(e) => setAwbNumber(e.target.value)}
              placeholder="Ej. 045-12345678"
              autoComplete="off"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="pin"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              PIN de empresa
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="6 a 8 dígitos"
                autoComplete="off"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verificando…' : 'Consultar estado'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          ¿No tiene PIN? Solicítelo a su contacto en Continental Cargo.
        </p>
      </div>
    </div>
  );
}
