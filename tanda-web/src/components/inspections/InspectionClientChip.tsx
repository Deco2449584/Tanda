import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { cn } from '@/lib/cn';

interface InspectionClientChipProps {
  name?: string;
  photoUrl?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

export function InspectionClientChip({
  name,
  photoUrl,
  variant = 'light',
  size = 'sm',
}: InspectionClientChipProps) {
  const label = name?.trim();
  if (!label && !photoUrl?.trim()) {
    return null;
  }

  const initial = (label || 'C').slice(0, 1).toUpperCase();
  const thumb = size === 'md' ? 'h-8 w-8 text-xs' : 'h-3.5 w-3.5 text-[8px]';
  const isDark = variant === 'dark';

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
        size === 'md' && 'rounded-lg px-2 py-1 text-xs',
        isDark
          ? 'bg-white/10 text-white/85'
          : 'bg-surface-hover text-subtle',
      )}
    >
      {photoUrl?.trim() ? (
        <FirebaseImage
          src={photoUrl}
          alt={label || 'Client'}
          width={32}
          height={32}
          className={cn('shrink-0 rounded-full object-cover', thumb)}
          sizes="32px"
          quality={70}
        />
      ) : (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full font-bold',
            thumb,
            isDark ? 'bg-white/20 text-white' : 'bg-zinc-600 text-white',
          )}
        >
          {initial}
        </span>
      )}
      {label ? <span className="truncate">{label}</span> : null}
    </span>
  );
}
