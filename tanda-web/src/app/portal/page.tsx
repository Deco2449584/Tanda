'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Lock,
  PackageSearch,
  ShieldCheck,
  Thermometer,
} from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { verifyPortalAccess } from '@/lib/portal/client-api';
import {
  PORTAL_COMPANY_TAGLINE,
  PORTAL_HIGHLIGHTS,
  PORTAL_TRUST_STATS,
} from '@/lib/portal/portal-brand';
import { savePortalSession } from '@/lib/portal/client-session';
import { COMPANY_NAME } from '@/lib/types/company-settings';

const HIGHLIGHT_ICONS = [PackageSearch, Camera, ShieldCheck] as const;

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
          : 'Could not verify access.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 flex-col lg:flex-row">
        <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[#001A3F] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-[#1A5FA8]/30 blur-3xl"
            aria-hidden
          />

          <div className="relative">
            <CompanyLogo
              invert
              priority
              className="h-20 w-auto max-w-[280px] object-contain sm:h-24"
            />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
              {PORTAL_COMPANY_TAGLINE}
            </p>

            <h1 className="mt-10 max-w-lg text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Cargo visibility for{' '}
              <span className="text-sky-300">forwarder partners.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
              {COMPANY_NAME} client portal — monitor perishable inspections,
              review evidence, and stay aligned with warehouse operations in
              real time.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-lg">
              {PORTAL_TRUST_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <ul className="relative mt-10 hidden space-y-3 lg:block">
            {PORTAL_HIGHLIGHTS.map((item, index) => {
              const Icon = HIGHLIGHT_ICONS[index] ?? PackageSearch;
              return (
                <li
                  key={item.title}
                  className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sky-200">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-sm text-white/65">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="relative mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 lg:hidden">
            <Thermometer className="h-5 w-5 shrink-0 text-sky-200" aria-hidden />
            <p className="text-sm text-white/80">
              Temperature-controlled perishables · Sydney air cargo hub
            </p>
          </div>
        </section>

        <section className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <CompanyLogo className="mx-auto h-16 w-auto" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#001A3F]/60">
                  Client portal
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Track your shipment
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Enter your AWB number and company PIN to view live inspection
                  status.
                </p>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label
                    htmlFor="awb"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#001A3F]/40 focus:bg-white focus:ring-2 focus:ring-[#001A3F]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pin"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Company PIN
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#001A3F]/40 focus:bg-white focus:ring-2 focus:ring-[#001A3F]/10"
                    />
                  </div>
                </div>

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
                  className="w-full rounded-xl bg-[#001A3F] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#001A3F]/20 transition hover:bg-[#0A2D5C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Check status'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
                Don&apos;t have a PIN? Contact your {COMPANY_NAME} representative.
              </p>
            </div>
          </div>
        </section>
      </div>

      <PortalFooter />
    </div>
  );
}
