import { NextResponse } from 'next/server';
import {
  clearRateLimit,
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
} from '@/lib/portal/rate-limit';
import { createPortalSessionToken } from '@/lib/portal/session';
import { verifyPortalAccountCredentials } from '@/lib/portal/server-inspections';

const INVALID_MESSAGE = 'Incorrect username or password.';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateKey = `login:${ip}`;

    if (isRateLimited(rateKey)) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username ?? '';
    const password = body.password ?? '';

    if (!username.trim() || !password) {
      recordFailedAttempt(rateKey);
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    const session = await verifyPortalAccountCredentials(username, password);
    if (!session) {
      recordFailedAttempt(rateKey);
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    clearRateLimit(rateKey);
    const token = await createPortalSessionToken(session);

    return NextResponse.json({
      token,
      kind: session.kind,
      clientName: session.clientName ?? '',
    });
  } catch (error) {
    console.error('POST /api/portal/login', error);
    return NextResponse.json(
      { error: 'Could not sign in.' },
      { status: 500 },
    );
  }
}
