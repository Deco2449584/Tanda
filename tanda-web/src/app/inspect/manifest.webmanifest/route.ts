import { NextResponse } from 'next/server';
import { getInspectManifest } from '@/lib/pwa/inspect-manifest';

export function GET() {
  return NextResponse.json(getInspectManifest(), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
