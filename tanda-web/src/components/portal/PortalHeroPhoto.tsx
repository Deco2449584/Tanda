import Image from 'next/image';
import { cn } from '@/lib/cn';

interface PortalHeroPhotoProps {
  src: string;
  priority?: boolean;
  /** Darken the side that holds the headline, or the bottom of a banner. */
  veil?: 'left' | 'bottom';
  className?: string;
}

export function PortalHeroPhoto({
  src,
  priority = false,
  veil = 'left',
  className,
}: PortalHeroPhotoProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        unoptimized
        sizes="100vw"
        className="object-cover object-center"
      />
      {veil === 'left' ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/15" />
      )}
    </div>
  );
}
