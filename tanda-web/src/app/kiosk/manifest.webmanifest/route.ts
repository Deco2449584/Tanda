import { NextResponse } from 'next/server';
import { getKioskManifest } from '@/lib/pwa/kiosk-manifest';

export function GET() {
  return NextResponse.json(getKioskManifest(), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
