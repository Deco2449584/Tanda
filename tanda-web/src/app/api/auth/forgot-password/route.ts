import { NextResponse } from 'next/server';
import {
  PasswordResetRequestError,
  requestPasswordReset,
} from '@/lib/auth/request-password-reset';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    await requestPasswordReset(body.email ?? '');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PasswordResetRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('POST /api/auth/forgot-password', error);
    return NextResponse.json(
      { error: 'Could not send the reset email. Please try again.' },
      { status: 500 },
    );
  }
}
