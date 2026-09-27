'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Could not send the reset email.');
        return;
      }

      setSent(true);
    } catch {
      setError('Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
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
            variant="horizontal"
            priority
            className="mx-auto h-16 w-auto object-contain"
          />
          <p className="mt-4 text-sm font-medium text-foreground">{COMPANY_NAME}</p>
        </div>

        {sent ? (
          <Card padding="lg" className="text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-foreground">Check your email</h1>
            <p className="mt-2 text-sm text-muted">
              We sent a password reset link to{' '}
              <span className="font-semibold text-foreground">{email.trim().toLowerCase()}</span>.
              Open it to choose a new password.
            </p>
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
                <h1 className="text-xl font-semibold text-foreground">Forgot password</h1>
                <p className="mt-0.5 text-sm text-muted">
                  Enter your company email. We will send a reset link if the account is active.
                </p>
              </div>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-sm text-muted">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@continental.com"
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
                {loading ? 'Checking email…' : 'Send reset link'}
              </Button>
            </form>
          </Card>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
