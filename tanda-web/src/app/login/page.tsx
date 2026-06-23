'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, Mail, Truck } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { fetchUserRoleForEmail } from '@/lib/auth/resolve-role';
import { getHomeRouteForRole } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { COMPANY_NAME } from '@/lib/types/company-settings';

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
    return (
      <div className="flex h-dvh items-center justify-center bg-surface-base app-ambient">
        <p className="text-sm text-muted">Loading session…</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const resolvedRole = await fetchUserRoleForEmail(credential.user.email);
      router.push(getHomeRouteForRole(resolvedRole));
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
        <div className="relative">
          <CompanyLogo invert priority className="h-20 w-auto object-contain" />
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
        </div>
        <p className="relative text-xs text-subtle">
          © {new Date().getFullYear()} {COMPANY_NAME}
        </p>
      </section>

      <section className="app-ambient relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-8 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <CompanyLogo invert priority className="h-16 w-auto object-contain" />
          </div>

          <Card padding="lg">
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use your company email to continue.</p>

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
