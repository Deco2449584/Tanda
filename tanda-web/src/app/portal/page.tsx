'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Lock, PackageSearch, ShieldCheck, User } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { PortalHeroPhoto } from '@/components/portal/PortalHeroPhoto';
import {
  loginPortalAccount,
  verifyPortalAccess,
} from '@/lib/portal/client-api';
import { PORTAL_HIGHLIGHTS } from '@/lib/portal/portal-brand';
import { savePortalSession } from '@/lib/portal/client-session';
import { COMPANY_NAME } from '@/lib/types/company-settings';

const HIGHLIGHT_ICONS = [PackageSearch, Camera, ShieldCheck] as const;

const PORTAL_SERVICES = [
  'Airfreight',
  'Seafreight',
  'Warehouse operations',
  'Cargo screeners',
] as const;

type PortalLoginMode = 'awb' | 'account';

function HighlightCard({
  item,
  icon: Icon,
}: {
  item: (typeof PORTAL_HIGHLIGHTS)[number];
  icon: (typeof HIGHLIGHT_ICONS)[number];
}) {
  return (
    <li className="rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F51EA0]/60 text-[#F51EA0]">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-3 text-sm font-bold text-white">{item.title}</p>
      <p className="mt-1 text-xs font-normal leading-relaxed text-white/70">
        {item.description}
      </p>
    </li>
  );
}

const fieldClass =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#F51EA0] focus:ring-2 focus:ring-[#F51EA0]/15';

export default function PortalLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PortalLoginMode>('awb');
  const [awbNumber, setAwbNumber] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'account') {
        const result = await loginPortalAccount(username, password);
        savePortalSession({
          token: result.token,
          kind: 'account',
          clientName: result.clientName,
        });
      } else {
        const result = await verifyPortalAccess(awbNumber, pin);
        savePortalSession({
          token: result.token,
          kind: 'awb',
          awbNumber: result.awbNumber,
          clientName: result.clientName,
        });
      }
      router.push('/portal/track');
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Could not verify access.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#141414] text-white">
      <section className="relative flex min-h-screen flex-col">
      <PortalHeroPhoto src="/portal/cargo-landing.webp" priority veil="left" />

      <div className="relative flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-8 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:py-12">
          <section className="flex-1">
            <CompanyLogo
              variant="horizontal"
              priority
              className="h-16 w-auto max-w-[240px] object-contain object-left mix-blend-screen sm:h-20"
            />
            <h1 className="mt-8 max-w-xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Keeping your cargo{' '}
              <span className="text-[#F51EA0]">in sight.</span>
            </h1>
            <p className="mt-4 max-w-md text-base font-normal leading-relaxed text-white/80">
              {COMPANY_NAME} client portal — monitor perishable inspections,
              review evidence, and stay aligned with warehouse operations.
            </p>

            <ul className="mt-8 hidden gap-3 lg:grid lg:grid-cols-3">
              {PORTAL_HIGHLIGHTS.map((item, index) => {
                const Icon = HIGHLIGHT_ICONS[index] ?? PackageSearch;
                return (
                  <HighlightCard key={item.title} item={item} icon={Icon} />
                );
              })}
            </ul>
          </section>

          <section className="w-full shrink-0 lg:w-[400px]">
            <div className="rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl shadow-black/40 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Client portal
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Track your cargo
              </h2>
              <p className="mt-2 text-sm font-normal text-zinc-500">
                Use a shipment AWB and company PIN, or sign in with your client
                account.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('awb');
                    setError('');
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    mode === 'awb'
                      ? 'bg-[#F51EA0] text-white'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  AWB + PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('account');
                    setError('');
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    mode === 'account'
                      ? 'bg-[#F51EA0] text-white'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Client login
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
                {mode === 'awb' ? (
                  <>
                    <div>
                      <label
                        htmlFor="awb"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        AWB number
                      </label>
                      <input
                        id="awb"
                        type="text"
                        value={awbNumber}
                        onChange={(e) => setAwbNumber(e.target.value)}
                        placeholder="e.g. 045-12345678"
                        autoComplete="off"
                        required
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pin"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        Company PIN
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                          aria-hidden
                        />
                        <input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="6–8 digits"
                          autoComplete="off"
                          required
                          className={`${fieldClass} pl-11`}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="portal-username"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        Username
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                          aria-hidden
                        />
                        <input
                          id="portal-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Your client username"
                          autoComplete="username"
                          required
                          className={`${fieldClass} pl-11`}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="portal-password"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                          aria-hidden
                        />
                        <input
                          id="portal-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          autoComplete="current-password"
                          required
                          className={`${fieldClass} pl-11`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {error ? (
                  <p
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#F51EA0] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#d4198a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? 'Verifying…'
                    : mode === 'account'
                      ? 'Sign in'
                      : 'Check status'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs font-normal leading-relaxed text-zinc-500">
                Need a PIN or account? Contact your {COMPANY_NAME} representative.
              </p>
            </div>
          </section>

          <ul className="grid gap-3 lg:hidden">
            {PORTAL_HIGHLIGHTS.map((item, index) => {
              const Icon = HIGHLIGHT_ICONS[index] ?? PackageSearch;
              return <HighlightCard key={item.title} item={item} icon={Icon} />;
            })}
          </ul>
        </div>

        <p className="mx-auto mt-auto flex w-full max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 pb-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75 lg:px-8">
          {PORTAL_SERVICES.map((service) => (
            <span key={service}>{service}</span>
          ))}
        </p>
      </div>
      </section>
      <PortalFooter />
    </div>
  );
}
