import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

import { BRAND } from '@/lib/brand/tokens';

export type LogoIconVariant = 'tab' | 'pwa';

/** Browser tab: light mark on graphite (reads well in dark Chrome tabs). */
const TAB_BACKGROUND = BRAND.graphite;
/** PWA / home screen: dark mark on white (matches continentalcargo.com.au). */
const PWA_BACKGROUND = '#FFFFFF';

const markCache = new Map<LogoIconVariant, string>();

async function getMarkDataUrl(variant: LogoIconVariant): Promise<string> {
  const cached = markCache.get(variant);
  if (cached) return cached;

  const fileName =
    variant === 'tab' ? 'logo-mark-light.png' : 'logo-mark.png';
  const png = await readFile(path.join(process.cwd(), 'public/logos', fileName));
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  markCache.set(variant, dataUrl);
  return dataUrl;
}

interface RenderLogoIconOptions {
  size: number;
  paddingRatio?: number;
  background?: string;
  /** `tab` = dark tile for browser favicon; `pwa` = white tile for install icons. */
  variant?: LogoIconVariant;
}

export async function renderLogoIcon({
  size,
  paddingRatio = 0.18,
  variant = 'pwa',
  background = variant === 'tab' ? TAB_BACKGROUND : PWA_BACKGROUND,
}: RenderLogoIconOptions) {
  const markSrc = await getMarkDataUrl(variant);
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
