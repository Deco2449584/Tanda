import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

let cachedLogoDataUrl: string | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  const svg = await readFile(path.join(process.cwd(), 'public/logo.svg'), 'utf8');
  cachedLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return cachedLogoDataUrl;
}

interface RenderLogoIconOptions {
  size: number;
  paddingRatio?: number;
  background?: string;
}

export async function renderLogoIcon({
  size,
  paddingRatio = 0.1,
  background = '#ffffff',
}: RenderLogoIconOptions) {
  const logoSrc = await getLogoDataUrl();
  const padding = Math.round(size * paddingRatio);
  const logoSize = size - padding * 2;

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
        }}
      >
        <img src={logoSrc} width={logoSize} height={logoSize} />
      </div>
    ),
    { width: size, height: size },
  );
}
