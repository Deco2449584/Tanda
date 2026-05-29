import { User } from 'lucide-react';

interface AttendancePhotoProps {
  photoUrl: string;
  name: string;
}

export function AttendancePhoto({ photoUrl, name }: AttendancePhotoProps) {
  if (!photoUrl) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-zinc-700">
        <User className="h-4 w-4 text-zinc-500" aria-hidden />
        <span className="sr-only">Sin foto de {name}</span>
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={`Foto de auditoría de ${name}`}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-700"
      referrerPolicy="no-referrer"
    />
  );
}
