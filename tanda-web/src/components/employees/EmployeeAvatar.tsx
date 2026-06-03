interface EmployeeAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function EmployeeAvatar({
  name,
  photoUrl,
  size = 'md',
}: EmployeeAvatarProps) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`Photo of ${name}`}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-zinc-700`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-zinc-800 font-bold text-primary ring-2 ring-zinc-700`}
    >
      {getInitials(name) || '?'}
    </div>
  );
}
