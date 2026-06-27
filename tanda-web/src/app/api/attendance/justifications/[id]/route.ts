import { NextResponse } from 'next/server';
import { reviewJustification } from '@/lib/attendance/server/attendance-alerts-service';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: 'approved' | 'rejected';
      reviewerNote?: string;
    };

    if (body.status !== 'approved' && body.status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    await reviewJustification({
      justificationId: id,
      status: body.status,
      reviewerEmail: admin.email,
      reviewerNote: body.reviewerNote,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not review justification.';
    console.error('PATCH /api/attendance/justifications/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
