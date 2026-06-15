import { NextResponse } from 'next/server';
import {
  getBearerToken,
  verifyPortalSessionToken,
} from '@/lib/portal/session';
import {
  enrichInspectionWithSignedMedia,
  fetchPortalInspectionById,
} from '@/lib/portal/server-inspections';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const session = await verifyPortalSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const { id } = await context.params;
    const inspection = await fetchPortalInspectionById(session, id);
    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found.' },
        { status: 404 },
      );
    }

    const enriched = await enrichInspectionWithSignedMedia(inspection);

    return NextResponse.json({ inspection: enriched });
  } catch (error) {
    console.error('GET /api/portal/inspections/[id]', error);
    return NextResponse.json(
      { error: 'Could not load inspection.' },
      { status: 500 },
    );
  }
}
