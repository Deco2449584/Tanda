import { NextResponse } from 'next/server';
import {
  clearRateLimit,
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
} from '@/lib/portal/rate-limit';
import { createPortalSessionToken } from '@/lib/portal/session';
import { verifyPortalCredentials } from '@/lib/portal/server-inspections';

const INVALID_MESSAGE = 'Incorrect AWB or PIN.';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateKey = `verify:${ip}`;

    if (isRateLimited(rateKey)) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      awbNumber?: string;
      pin?: string;
    };

    const awbNumber = body.awbNumber ?? '';
    const pin = body.pin ?? '';

    if (!awbNumber.trim() || !pin.trim()) {
      recordFailedAttempt(rateKey);
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    const session = await verifyPortalCredentials(awbNumber, pin);
    if (!session) {
      recordFailedAttempt(rateKey);
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    clearRateLimit(rateKey);
    const token = await createPortalSessionToken(session);

    return NextResponse.json({
      token,
      awbNumber: session.awbNumber,
    });
  } catch (error) {
    console.error('POST /api/portal/verify', error);
    return NextResponse.json(
      { error: 'Could not verify access.' },
      { status: 500 },
    );
  }
}
