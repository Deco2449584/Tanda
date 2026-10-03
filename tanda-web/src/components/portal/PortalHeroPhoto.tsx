import Image from 'next/image';
import { cn } from '@/lib/cn';

interface PortalHeroPhotoProps {
  priority?: boolean;
  /** Darken the side that holds the headline, or the bottom of a banner. */
  veil?: 'left' | 'bottom';
  className?: string;
}

export function PortalHeroPhoto({
  priority = false,
  veil = 'left',
  className,
}: PortalHeroPhotoProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden>
      <Image
        src="/portal/cargo-hero.webp"
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-[center_40%]"
      />
      {veil === 'left' ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-black/35 to-black/15" />
      )}
    </div>
  );
}
