import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BRAND } from '@/lib/brand/tokens';

export const runtime = 'nodejs';
export const alt = 'Continental Cargo Workspace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** WhatsApp / social preview — Continental mark only (no Vercel default OG). */
export default async function OpenGraphImage() {
  const png = await readFile(
    path.join(process.cwd(), 'public/logos/logo-mark-light.png'),
  );
  const markSrc = `data:image/png;base64,${png.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(145deg, ${BRAND.graphite} 0%, #1a1a1a 55%, #121212 100%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} width={220} height={220} alt="" />
        <div
          style={{
            marginTop: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            Continental Cargo
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 28,
              color: BRAND.silver,
            }}
          >
            Workforce operations platform
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
