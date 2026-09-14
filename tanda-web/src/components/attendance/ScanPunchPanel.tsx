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
  isRetryableGeoError,
  ScanPunchRequestError,
  submitScanPunchRequest,
  type ScanPunchResponse,
} from '@/lib/attendance/scan-punch-api';
import type { ScanPunchVia } from '@/lib/attendance/scan-punch-token';
import {
  captureGeofencePosition,
  captureScanPunchPosition,
} from '@/lib/geo/capture-position';
import { useAuthRole } from '@/hooks/useAuthRole';
import { getHomeRouteForRole } from '@/lib/auth/roles';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

type PunchPhase = 'auth' | 'punching' | 'locating' | 'success' | 'error';

const pendingPunches = new Map<string, Promise<ScanPunchResponse>>();
const recentPunchResults = new Map<
  string,
  { result: ScanPunchResponse; at: number }
>();
const RECENT_PUNCH_MS = 8_000;

interface ScanPunchPanelProps {
  token: string;
  via?: ScanPunchVia;
  /** Where /login should return to. Defaults to the scan URL itself. */
  loginReturnPath?: string;
  /** Called once the punch is recorded — used to burn a one-time claim. */
  onCompleted?: () => void;
}

export function ScanPunchPanel({
  token,
  via = 'qr',
  loginReturnPath,
  onCompleted,
}: ScanPunchPanelProps) {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuthRole();
  const [phase, setPhase] = useState<PunchPhase>('auth');
  const [error, setError] = useState('');
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [result, setResult] = useState<ScanPunchResponse | null>(null);
  const startedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);

  const returnPath =
    loginReturnPath ?? `/punch/s/${token}?via=${via === 'nfc' ? 'nfc' : 'qr'}`;

  const runPunch = useCallback(async (lockKey: string) => {
    setPhase('punching');
    setError('');
    setGeoBlocked(false);

    const recent = recentPunchResults.get(lockKey);
    if (recent && Date.now() - recent.at < RECENT_PUNCH_MS) {
      setResult(recent.result);
      setPhase('success');
      onCompletedRef.current?.();
      return;
    }

    let request = pendingPunches.get(lockKey);
    if (!request) {
      request = (async () => {
        // Fast geo (max ~1.5s) — do not block punch on high-accuracy GPS.
        const geo = await captureScanPunchPosition();

        try {
          return await submitScanPunchRequest({
            token,
            via,
            latitude: geo?.latitude,
            longitude: geo?.longitude,
            geoAccuracy: geo?.accuracy,
            geoCapturedAt: geo?.geoCapturedAt,
          });
        } catch (err) {
          // This site requires proof of presence — wait for a real GPS fix.
          if (!isRetryableGeoError(err)) throw err;

          setPhase('locating');
          const precise = await captureGeofencePosition();
          if (!precise) throw err;

          return await submitScanPunchRequest({
            token,
            via,
            latitude: precise.latitude,
            longitude: precise.longitude,
            geoAccuracy: precise.accuracy,
            geoCapturedAt: precise.geoCapturedAt,
          });
        }
      })();
      pendingPunches.set(lockKey, request);
    }

    try {
      const response = await request;
      recentPunchResults.set(lockKey, { result: response, at: Date.now() });
      setResult(response);
      setPhase('success');
      onCompletedRef.current?.();
    } catch (err) {
      startedRef.current = false;
      setGeoBlocked(
        err instanceof ScanPunchRequestError && Boolean(err.reason),
      );
      setError(err instanceof Error ? err.message : 'Could not record punch.');
      setPhase('error');
    } finally {
      pendingPunches.delete(lockKey);
    }
  }, [token, via]);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPhase('auth');
      router.replace(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;
    void runPunch(`${user.uid}:${token}:${via}`);
  }, [authLoading, returnPath, router, runPunch, token, user, via]);

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

        {phase === 'locating' ? (
          <StatusBlock
            icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
            title="Confirming you are on site…"
            body="This client requires location to clock in. Keep this screen open while we get a GPS fix."
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
            {geoBlocked ? (
              <p className="mx-auto max-w-sm rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-left text-xs leading-relaxed text-amber-200">
                Clock-in at this client only works on site. Allow location
                access for this site in your browser settings, stay near the
                entrance, and try again.
              </p>
            ) : null}
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
                href={`/login?next=${encodeURIComponent(returnPath)}`}
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
