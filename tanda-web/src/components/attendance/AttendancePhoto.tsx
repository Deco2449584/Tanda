import { User } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';

interface AttendancePhotoProps {
  photoUrl: string;
  name: string;
}

export function AttendancePhoto({ photoUrl, name }: AttendancePhotoProps) {
  if (!photoUrl) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover ring-2 ring-zinc-700">
        <User className="h-4 w-4 text-subtle" aria-hidden />
        <span className="sr-only">No photo for {name}</span>
      </div>
    );
  }

  return (
    <FirebaseImage
      src={photoUrl}
      alt={`Audit photo of ${name}`}
      width={32}
      height={32}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-700"
      sizes="32px"
      quality={70}
    />
  );
}
