import { type NextRequest } from 'next/server';
import { renderLogoIcon } from '@/lib/pwa/render-logo-icon';

const ALLOWED_SIZES = new Set([192, 512]);

export async function GET(request: NextRequest) {
  const rawSize = Number(request.nextUrl.searchParams.get('size') ?? 192);
  const size = ALLOWED_SIZES.has(rawSize) ? rawSize : 192;
  const maskable = request.nextUrl.searchParams.get('maskable') === '1';

  return renderLogoIcon({
    size,
    paddingRatio: maskable ? 0.2 : 0.1,
  });
}
