'use client';

import Image from 'next/image';
import { isBlobOrDataUrl, isFirebaseStorageUrl } from '@/utils/imageOptimizer';

interface FirebaseImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Above-the-fold only (logo, hero). Default lazy-loads. */
  priority?: boolean;
  /** Responsive srcset hint for next/image — always set for Firebase URLs. */
  sizes?: string;
  /** next/image quality 1–100 (default 75). */
  quality?: number;
}

const DEFAULT_QUALITY = 75;

/**
 * Firebase Storage → next/image (lazy, optimized WebP/AVIF, edge cache).
 * Blob/data/local previews → native img with lazy + async decode.
 */
export function FirebaseImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
  quality = DEFAULT_QUALITY,
}: FirebaseImageProps) {
  if (!src) {
    return null;
  }

  const resolvedSizes =
    sizes ?? `(max-width: 768px) ${width}px, ${width}px`;

  if (!isFirebaseStorageUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={isBlobOrDataUrl(src) ? false : undefined}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      sizes={resolvedSizes}
      quality={quality}
    />
  );
}
