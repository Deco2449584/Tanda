import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

/** Match continentalcargo.com.au favicon: dark mark on white. */
const ICON_BACKGROUND = '#FFFFFF';

let cachedMarkDataUrl: string | null = null;

async function getMarkDataUrl(): Promise<string> {
  if (cachedMarkDataUrl) {
    return cachedMarkDataUrl;
  }

  const png = await readFile(
    path.join(process.cwd(), 'public/logos/logo-mark-icon.png'),
  );
  cachedMarkDataUrl = `data:image/png;base64,${png.toString('base64')}`;
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
  background = ICON_BACKGROUND,
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} width={markSize} height={markSize} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
