'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  CalendarDays,
  Clock,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getHomeRouteForRole, getRoleFromEmail } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'The email address is not valid.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

const highlights = [
  {
    icon: Clock,
    title: 'Time & attendance',
    description: 'Real-time check-ins with photo verification.',
  },
  {
    icon: CalendarDays,
    title: 'Smart scheduling',
    description: 'Plan shifts and manage coverage in one place.',
  },
  {
    icon: ShieldCheck,
    title: 'Leave & compliance',
    description: 'Approve requests and keep payroll audit-ready.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const role = getRoleFromEmail(credential.user.email);
      router.push(getHomeRouteForRole(role));
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden lg:flex-row">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.18),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl"
        aria-hidden
      />

      <section className="relative hidden h-full min-h-0 flex-1 flex-col justify-between overflow-y-auto border-r border-zinc-800/80 bg-[#0a0a0a] p-10 lg:flex xl:p-14">
        <div>
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            TimeTracker PRO
          </div>

          <Image
            src="/logo.svg"
            alt="Continental Cargo"
            width={520}
            height={180}
            className="h-28 w-auto max-w-full object-contain xl:h-36"
            priority
          />

          <h1 className="mt-8 max-w-md text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Workforce operations,{' '}
            <span className="text-emerald-400">under control.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
            The Continental Cargo portal for admins and staff — attendance,
            schedules, leave, and payroll insights in a single secure workspace.
          </p>
        </div>

        <ul className="mt-10 space-y-4">
          {highlights.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-zinc-600">
          © {new Date().getFullYear()} Continental Cargo. All rights reserved.
        </p>
      </section>

      <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-10 sm:py-8 lg:justify-center lg:px-14 lg:py-10 xl:px-20">
        <div className="mx-auto my-auto w-full max-w-md lg:my-0">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Image
              src="/logo.svg"
              alt="Continental Cargo"
              width={480}
              height={160}
              className="h-24 w-full max-w-[320px] object-contain sm:h-28"
              priority
            />
            <p className="mt-3 text-center text-xs font-medium uppercase tracking-widest text-emerald-500/90">
              TimeTracker PRO
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
            <div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Sign in with your company email to continue.
              </p>
            </div>

            <div className="mb-6 lg:hidden">
              <h2 className="text-center text-xl font-bold text-white">
                Welcome back
              </h2>
              <p className="mt-1 text-center text-sm text-zinc-400">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    aria-hidden
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@continental.com"
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    aria-hidden
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {error && (
                <div
                  className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-center text-sm text-red-300"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-xl bg-emerald-600 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in to platform'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-600 lg:hidden">
              Secure access for Continental Cargo employees and administrators.
            </p>
          </div>

          <p className="mt-6 hidden text-center text-xs text-zinc-600 lg:block">
            Need help? Contact your system administrator.
          </p>
        </div>
      </section>
    </div>
  );
}
