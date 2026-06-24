const KIOSK_MANIFEST_HREF = '/kiosk/manifest.webmanifest';

function upsertLink(rel: string, href: string, attrs?: Record<string, string>) {
  const selector =
    rel === 'manifest'
      ? `link[rel="manifest"]`
      : `link[rel="${rel}"]${attrs?.sizes ? `[sizes="${attrs.sizes}"]` : ''}`;

  let link = document.querySelector<HTMLLinkElement>(selector);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.href = href;

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      link.setAttribute(key, value);
    }
  }
}

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }

  meta.content = content;
}

export function ensureKioskPwaHead() {
  document.querySelectorAll('link[rel="manifest"]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!href.includes('/kiosk/')) {
      link.remove();
    }
  });

  upsertLink('manifest', KIOSK_MANIFEST_HREF);
  upsertLink('apple-touch-icon', '/kiosk/apple-icon', {
    sizes: '180x180',
  });

  upsertMeta('mobile-web-app-capable', 'yes');
  upsertMeta('apple-mobile-web-app-capable', 'yes');
  upsertMeta('apple-mobile-web-app-title', 'Kiosk');
  upsertMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  upsertMeta('theme-color', '#09090b');

  let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }

  viewport.content =
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
}

export function isKioskStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosStandalone =
    'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    iosStandalone ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}
