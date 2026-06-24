import { NextResponse } from 'next/server';
import { getWorkforceManifest } from '@/lib/pwa/workforce-manifest';

export function GET() {
  return NextResponse.json(getWorkforceManifest(), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
