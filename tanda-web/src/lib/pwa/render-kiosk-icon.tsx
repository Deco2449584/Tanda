import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

const KIOSK_BACKGROUND = '#09090b';
const KIOSK_ACCENT = '#e5a23c';

let cachedMarkDataUrl: string | null = null;

async function getMarkDataUrl(): Promise<string> {
  if (cachedMarkDataUrl) {
    return cachedMarkDataUrl;
  }

  const svg = await readFile(
    path.join(process.cwd(), 'public/logo-mark-light.svg'),
    'utf8',
  );
  cachedMarkDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return cachedMarkDataUrl;
}

interface RenderKioskIconOptions {
  size: number;
  paddingRatio?: number;
}

export async function renderKioskIcon({
  size,
  paddingRatio = 0.16,
}: RenderKioskIconOptions) {
  const markSrc = await getMarkDataUrl();
  const padding = Math.round(size * paddingRatio);
  const markSize = Math.round((size - padding * 2) * 0.72);
  const labelSize = Math.max(10, Math.round(size * 0.07));

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
          background: KIOSK_BACKGROUND,
          borderRadius: Math.round(size * 0.2),
          border: `3px solid ${KIOSK_ACCENT}`,
        }}
      >
        <img src={markSrc} width={markSize} height={markSize} />
        <div
          style={{
            marginTop: Math.round(size * 0.04),
            color: KIOSK_ACCENT,
            fontSize: labelSize,
            fontWeight: 800,
            letterSpacing: 2,
          }}
        >
          KIOSK
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
