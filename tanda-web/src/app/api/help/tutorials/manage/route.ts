import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  createHelpTutorial,
  listAllHelpTutorials,
  serializeHelpTutorials,
} from '@/lib/help/server/help-tutorials-service';
import type { CreateHelpTutorialInput } from '@/lib/types/help-tutorial';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const tutorials = await listAllHelpTutorials();
    return NextResponse.json({ tutorials: serializeHelpTutorials(tutorials) });
  } catch (error) {
    console.error('GET /api/help/tutorials/manage', error);
    return NextResponse.json({ error: 'Could not load tutorials.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as CreateHelpTutorialInput;
    const tutorial = await createHelpTutorial({
      payload: body,
      createdByEmail: admin.email,
    });

    return NextResponse.json({
      ok: true,
      tutorial: serializeHelpTutorials([tutorial])[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create tutorial.';
    console.error('POST /api/help/tutorials/manage', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
