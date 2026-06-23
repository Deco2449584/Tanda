import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';

interface FilterBarProps {
  children?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export function FilterBar({
  children,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {onSearchChange !== undefined ? (
        <div className="relative w-full sm:min-w-[240px] sm:flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-10"
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}
