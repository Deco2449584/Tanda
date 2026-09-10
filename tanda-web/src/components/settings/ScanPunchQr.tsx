'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface ScanPunchQrProps {
  url: string;
  size?: number;
  className?: string;
}

export function ScanPunchQr({ url, size = 180, className }: ScanPunchQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);

    void QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
    }).then((value) => {
      if (!cancelled) setDataUrl(value);
    });

    return () => {
      cancelled = true;
    };
  }, [size, url]);

  if (!dataUrl) {
    return (
      <div
        className={`animate-pulse rounded-xl bg-surface-base ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Scan punch QR code"
      width={size}
      height={size}
      className={`rounded-xl bg-white p-2 shadow-sm ${className ?? ''}`}
    />
  );
}

export async function downloadScanPunchQr(input: {
  url: string;
  fileName: string;
  size?: number;
}): Promise<void> {
  const dataUrl = await QRCode.toDataURL(input.url, {
    width: input.size ?? 1024,
    margin: 2,
    color: { dark: '#111111', light: '#ffffff' },
  });

  const safeName = input.fileName
    .trim()
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeName || 'scan-punch'}-qr.png`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
