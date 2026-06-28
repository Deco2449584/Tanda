import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  deleteHelpTutorial,
  serializeHelpTutorials,
  updateHelpTutorial,
} from '@/lib/help/server/help-tutorials-service';
import type { UpdateHelpTutorialInput } from '@/lib/types/help-tutorial';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateHelpTutorialInput;
    const tutorial = await updateHelpTutorial(id, body);

    return NextResponse.json({
      ok: true,
      tutorial: serializeHelpTutorials([tutorial])[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update tutorial.';
    console.error('PATCH /api/help/tutorials/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    await deleteHelpTutorial(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete tutorial.';
    console.error('DELETE /api/help/tutorials/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
