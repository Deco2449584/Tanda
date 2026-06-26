'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  CalendarDays,
  Clock,
  Lock,
  Mail,
  PackageSearch,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  fetchEmployeeSessionForEmail,
  getEmployeeSessionBlockMessage,
} from '@/lib/auth/employee-session';
import { getHomeRouteForRole } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSplash } from '@/components/ui/LoadingSplash';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { COMPANY_NAME } from '@/lib/types/company-settings';

const FEATURES = [
  {
    icon: Clock,
    title: 'Attendance',
    description: 'Real-time check-ins and work sessions',
  },
  {
    icon: CalendarDays,
    title: 'Scheduling',
    description: 'Shift planning across your teams',
  },
  {
    icon: ShieldCheck,
    title: 'Leave requests',
    description: 'Approvals and time-off tracking',
  },
  {
    icon: PackageSearch,
    title: 'Compliance',
    description: 'Inspections and audit-ready records',
  },
] as const;

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'The email address is not valid.';
    case 'auth/user-disabled':
      return 'Your account has been deactivated. Contact your administrator.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuthRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user || !role) return;
    router.replace(getHomeRouteForRole(role));
  }, [authLoading, role, router, user]);

  if (authLoading) {
    return <LoadingSplash message="Loading session…" />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const session = await fetchEmployeeSessionForEmail(credential.user.email);
      const blockMessage = getEmployeeSessionBlockMessage(session);

      if (blockMessage) {
        await signOut(auth);
        setError(blockMessage);
        return;
      }

      router.push(getHomeRouteForRole(session.role));
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
      <section className="relative hidden min-h-0 flex-1 flex-col justify-between overflow-hidden border-r border-border bg-surface-sidebar p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(rgba(77,124,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77,124,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-secondary/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <CompanyLogo variant="light" priority className="h-20 w-auto object-contain" />
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-raised px-3 py-1 text-xs font-medium text-secondary">
            <Truck className="h-3.5 w-3.5" />
            Logistics workforce platform
          </div>
          <h1 className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight text-foreground xl:text-4xl">
            Operations hub for{' '}
            <span className="text-primary">{COMPANY_NAME}</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
            Attendance, scheduling, leave management and compliance — one secure
            workspace for administrators and field staff.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-surface-raised/80 p-4 backdrop-blur-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-subtle">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-subtle">
          © {new Date().getFullYear()} {COMPANY_NAME}
        </p>
      </section>

      <section className="app-ambient relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-8 sm:px-10 lg:px-16 xl:px-20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/8 via-transparent to-transparent lg:hidden"
          aria-hidden
        />

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-raised/60 px-6 py-7 text-center backdrop-blur-sm">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(77,124,255,0.12),transparent_70%)]"
                aria-hidden
              />
              <CompanyLogo
                variant="light"
                priority
                className="relative mx-auto h-16 w-auto object-contain"
              />
              <p className="relative mt-4 text-sm font-medium text-foreground">
                Workforce operations platform
              </p>
              <p className="relative mt-1 text-xs text-muted">
                Sign in to manage attendance, schedules and leave.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {FEATURES.map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised/50 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-muted text-primary">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-medium text-muted">{title}</span>
                </div>
              ))}
            </div>
          </div>

          <Card padding="lg" className="shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 border-b border-border pb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary">
                <Lock className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Use your company email to continue.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@continental.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm text-muted">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10"
                  />
                </div>
              </div>

              {error ? (
                <div
                  className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-center text-sm text-danger"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-xs text-subtle">
            Need help? Contact your system administrator.
          </p>
        </div>
      </section>
    </div>
  );
}
