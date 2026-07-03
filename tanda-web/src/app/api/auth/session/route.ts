import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import {
  claimAuthSessionRecord,
  releaseAuthSessionRecord,
} from '@/lib/auth/server/auth-session-service';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

async function loadEmployeeRole(email: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  return resolveRoleFromEmployee({
    role: typeof data.role === 'string' ? data.role : undefined,
    department: typeof data.department === 'string' ? data.department : undefined,
  });
}

/** Claims the active browser session for non-kiosk users (last login wins). */
export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const role = await loadEmployeeRole(user.email);
    if (role === 'kiosk') {
      return NextResponse.json({ ok: true, exempt: true });
    }

    const body = (await request.json().catch(() => null)) as {
      sessionId?: string;
    } | null;

    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    await claimAuthSessionRecord(user.uid, sessionId, {
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/auth/session', error);
    return NextResponse.json({ error: 'Could not claim session.' }, { status: 500 });
  }
}

/** Clears the active session when the current browser signs out intentionally. */
export async function DELETE(request: Request) {
  try {
    const user = await verifyFirebaseToken(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const role = await loadEmployeeRole(user.email);
    if (role === 'kiosk') {
      return NextResponse.json({ ok: true, exempt: true });
    }

    const body = (await request.json().catch(() => null)) as {
      sessionId?: string;
    } | null;

    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    await releaseAuthSessionRecord(user.uid, sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/auth/session', error);
    return NextResponse.json({ error: 'Could not release session.' }, { status: 500 });
  }
}
