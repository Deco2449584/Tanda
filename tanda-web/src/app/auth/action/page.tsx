'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { CheckCircle2, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { getPasswordResetErrorMessage } from '@/lib/auth/password-reset-errors';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSplash } from '@/components/ui/LoadingSplash';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { COMPANY_NAME } from '@/lib/types/company-settings';

type PagePhase = 'verifying' | 'form' | 'invalid' | 'success';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<PagePhase>('verifying');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!auth) {
      setPhase('invalid');
      setError('Authentication is not available.');
      return;
    }

    if (mode !== 'resetPassword' || !oobCode) {
      setPhase('invalid');
      setError('This link is not valid for setting a password.');
      return;
    }

    let cancelled = false;

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        if (cancelled) return;
        setAccountEmail(email);
        setPhase('form');
      })
      .catch((verifyError) => {
        if (cancelled) return;
        const code =
          verifyError && typeof verifyError === 'object' && 'code' in verifyError
            ? String((verifyError as { code: string }).code)
            : '';
        setError(getPasswordResetErrorMessage(code));
        setPhase('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  useEffect(() => {
    if (phase !== 'success') return;

    const timer = window.setTimeout(() => {
      router.replace('/login?passwordSet=1');
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [phase, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!auth || !oobCode) {
      setError('This link is not valid for setting a password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPhase('success');
    } catch (submitError) {
      const code =
        submitError && typeof submitError === 'object' && 'code' in submitError
          ? String((submitError as { code: string }).code)
          : '';
      setError(getPasswordResetErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'verifying') {
    return <LoadingSplash message="Verifying your invite link…" />;
  }

  return (
    <div className="app-ambient relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-8 sm:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/8 via-transparent to-transparent"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <CompanyLogo
            variant="light"
            priority
            className="mx-auto h-16 w-auto object-contain"
          />
          <p className="mt-4 text-sm font-medium text-foreground">{COMPANY_NAME}</p>
        </div>

        {phase === 'success' ? (
          <Card padding="lg" className="text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-foreground">Password set</h1>
            <p className="mt-2 text-sm text-muted">
              Your account is ready. Redirecting you to sign in…
            </p>
          </Card>
        ) : phase === 'invalid' ? (
          <Card padding="lg" className="shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                <ShieldAlert className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Link unavailable</h1>
                <p className="mt-2 text-sm text-muted">{error}</p>
              </div>
            </div>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Back to sign in
            </Link>
          </Card>
        ) : (
          <Card padding="lg" className="shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 border-b border-border pb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary">
                <KeyRound className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Set your password</h1>
                <p className="mt-0.5 text-sm text-muted">
                  {accountEmail
                    ? `Create a password for ${accountEmail}`
                    : 'Create a password for your account'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm text-muted">
                  New password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm text-muted">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
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

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Saving password…' : 'Save password'}
              </Button>
            </form>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-subtle">
          Need help? Contact your system administrator.
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSplash message="Loading…" />}>
      <SetPasswordContent />
    </Suspense>
  );
}
