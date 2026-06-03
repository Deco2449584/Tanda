'use client';

import Image from 'next/image';
import { isFirebaseStorageUrl } from '@/utils/imageOptimizer';

interface FirebaseImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Uses next/image (lazy by default) for Firebase Storage URLs; falls back to img for blob/local previews.
 */
export function FirebaseImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}: FirebaseImageProps) {
  if (!isFirebaseStorageUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} width={width} height={height} className={className} />
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
      sizes={sizes}
    />
  );
}
