'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  LogIn,
  MapPin,
  XCircle,
} from 'lucide-react';
import { formatAttendanceType } from '@/lib/attendance/format';
import {
  submitScanPunchRequest,
  type ScanPunchResponse,
} from '@/lib/attendance/scan-punch-api';
import type { ScanPunchVia } from '@/lib/attendance/scan-punch-token';
import { captureScanPunchPosition } from '@/lib/geo/capture-position';
import { useAuthRole } from '@/hooks/useAuthRole';
import { getHomeRouteForRole } from '@/lib/auth/roles';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

type PunchPhase = 'auth' | 'punching' | 'success' | 'error';

const pendingPunches = new Map<string, Promise<ScanPunchResponse>>();
const recentPunchResults = new Map<
  string,
  { result: ScanPunchResponse; at: number }
>();
const RECENT_PUNCH_MS = 8_000;

interface ScanPunchPanelProps {
  token: string;
  via?: ScanPunchVia;
}

export function ScanPunchPanel({ token, via = 'qr' }: ScanPunchPanelProps) {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuthRole();
  const [phase, setPhase] = useState<PunchPhase>('auth');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanPunchResponse | null>(null);
  const startedRef = useRef(false);

  const runPunch = useCallback(async (lockKey: string) => {
    setPhase('punching');
    setError('');

    const recent = recentPunchResults.get(lockKey);
    if (recent && Date.now() - recent.at < RECENT_PUNCH_MS) {
      setResult(recent.result);
      setPhase('success');
      return;
    }

    let request = pendingPunches.get(lockKey);
    if (!request) {
      request = (async () => {
        // Fast geo (max ~1.5s) — do not block punch on high-accuracy GPS.
        const geo = await captureScanPunchPosition();
        return submitScanPunchRequest({
          token,
          via,
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          geoAccuracy: geo?.accuracy,
          geoCapturedAt: geo?.geoCapturedAt,
        });
      })();
      pendingPunches.set(lockKey, request);
    }

    try {
      const response = await request;
      recentPunchResults.set(lockKey, { result: response, at: Date.now() });
      setResult(response);
      setPhase('success');
    } catch (err) {
      startedRef.current = false;
      setError(err instanceof Error ? err.message : 'Could not record punch.');
      setPhase('error');
    } finally {
      pendingPunches.delete(lockKey);
    }
  }, [token, via]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPhase('auth');
      const nextPath =
        via === 'nfc'
          ? `/punch/s/${token}?via=nfc`
          : `/punch/s/${token}?via=qr`;
      const next = encodeURIComponent(nextPath);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;
    void runPunch(`${user.uid}:${token}:${via}`);
  }, [authLoading, router, runPunch, token, user, via]);

  const homeHref = role ? getHomeRouteForRole(role) : '/employee-dashboard';

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <CompanyLogo className="h-10 w-auto" />
      </div>

      <section className="rounded-2xl border border-border bg-surface-raised p-6 shadow-lg">
        {phase === 'auth' || authLoading ? (
          <StatusBlock
            icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
            title="Checking session…"
            body="You need to be signed in to clock in with this link."
          />
        ) : null}

        {phase === 'punching' ? (
          <StatusBlock
            icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
            title="Recording punch…"
            body={
              via === 'nfc'
                ? 'NFC tag detected — recording your clock action…'
                : 'QR scan detected — recording your clock action…'
            }
          />
        ) : null}

        {phase === 'success' && result ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {formatAttendanceType(result.actionType)} recorded
              </p>
              <p className="mt-1 text-sm text-muted">{result.employeeName}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                via {via === 'nfc' ? 'NFC' : 'QR'}
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-base/60 px-3 py-2 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {result.locationName}
              {result.locationCity ? ` · ${result.locationCity}` : ''}
            </p>
            <p className="text-[11px] text-subtle">
              {new Date(result.recordedAt).toLocaleString()}
            </p>
            <Link
              href={homeHref}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Continue
            </Link>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-400" />
            <div>
              <p className="text-lg font-semibold text-foreground">Punch failed</p>
              <p className="mt-2 text-sm text-muted">{error}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const lockKey = user ? `${user.uid}:${token}:${via}` : token;
                  recentPunchResults.delete(lockKey);
                  pendingPunches.delete(lockKey);
                  startedRef.current = true;
                  void runPunch(lockKey);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Try again
              </button>
              <Link
                href={`/login?next=${encodeURIComponent(`/punch/s/${token}?via=${via}`)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StatusBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted">{body}</p>
    </div>
  );
}
