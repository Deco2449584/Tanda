import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

import { BRAND } from '@/lib/brand/tokens';

const BRAND_BACKGROUND = BRAND.graphite;

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

interface RenderLogoIconOptions {
  size: number;
  paddingRatio?: number;
  background?: string;
}

export async function renderLogoIcon({
  size,
  paddingRatio = 0.18,
  background = BRAND_BACKGROUND,
}: RenderLogoIconOptions) {
  const markSrc = await getMarkDataUrl();
  const padding = Math.round(size * paddingRatio);
  const markSize = size - padding * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          borderRadius: Math.round(size * 0.2),
        }}
      >
        <img src={markSrc} width={markSize} height={markSize} />
      </div>
    ),
    { width: size, height: size },
  );
}
