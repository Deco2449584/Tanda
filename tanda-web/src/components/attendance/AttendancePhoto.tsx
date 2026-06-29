import { User } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';

interface AttendancePhotoProps {
  photoUrl: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const ICON_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

const PIXEL_SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export function AttendancePhoto({
  photoUrl,
  name,
  size = 'md',
}: AttendancePhotoProps) {
  const boxClass = SIZE_CLASSES[size];
  const iconClass = ICON_CLASSES[size];
  const pixels = PIXEL_SIZES[size];

  if (!photoUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-surface-hover ring-2 ring-zinc-700 ${boxClass}`}
      >
        <User className={`${iconClass} text-subtle`} aria-hidden />
        <span className="sr-only">No photo for {name}</span>
      </div>
    );
  }

  return (
    <FirebaseImage
      src={photoUrl}
      alt={`Audit photo of ${name}`}
      width={pixels}
      height={pixels}
      className={`shrink-0 rounded-full object-cover ring-2 ring-zinc-700 ${boxClass}`}
      sizes={`${pixels}px`}
      quality={70}
    />
  );
}
