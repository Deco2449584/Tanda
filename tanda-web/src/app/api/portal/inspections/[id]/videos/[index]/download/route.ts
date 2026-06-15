import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';
import { fetchPortalInspectionById } from '@/lib/portal/server-inspections';
import { extractStoragePathFromUrl } from '@/lib/portal/storage-path';
import {
  getBearerToken,
  verifyPortalSessionToken,
} from '@/lib/portal/session';

interface RouteContext {
  params: Promise<{ id: string; index: string }>;
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

    const { id, index: indexParam } = await context.params;
    const videoIndex = Number.parseInt(indexParam, 10);
    if (!Number.isInteger(videoIndex) || videoIndex < 0) {
      return NextResponse.json({ error: 'Invalid video index.' }, { status: 400 });
    }

    const inspection = await fetchPortalInspectionById(session, id);
    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found.' }, { status: 404 });
    }

    const videoUrl = inspection.videoEvidence[videoIndex];
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    const storagePath = extractStoragePathFromUrl(videoUrl);
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Could not resolve video storage path.' },
        { status: 400 },
      );
    }

    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Video file not found.' }, { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const fileName =
      storagePath.split('/').pop()?.split('?')[0] ||
      `inspection-video-${videoIndex + 1}.mp4`;

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': metadata.contentType || 'video/mp4',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/portal/inspections/[id]/videos/[index]/download', error);
    return NextResponse.json(
      { error: 'Could not download video.' },
      { status: 500 },
    );
  }
}
