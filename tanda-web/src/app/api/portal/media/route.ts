import { NextResponse } from 'next/server';
import {
  getBearerToken,
  verifyPortalSessionToken,
} from '@/lib/portal/session';
import { signMediaUrls } from '@/lib/portal/server-inspections';

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const session = await verifyPortalSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Sesión expirada.' }, { status: 401 });
    }

    const body = (await request.json()) as { urls?: string[] };
    const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean) : [];

    if (urls.length === 0) {
      return NextResponse.json({ signed: {} });
    }

    const signed = await signMediaUrls(urls.slice(0, 50));
    return NextResponse.json({ signed });
  } catch (error) {
    console.error('POST /api/portal/media', error);
    return NextResponse.json(
      { error: 'No se pudieron firmar los archivos.' },
      { status: 500 },
    );
  }
}
