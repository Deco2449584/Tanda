import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  loading?: boolean;
  accent?: 'primary' | 'secondary';
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  loading = false,
  accent = 'primary',
  className,
}: StatCardProps) {
  const accentClass =
    accent === 'secondary'
      ? 'bg-secondary-muted text-secondary'
      : 'bg-primary-muted text-primary';

  return (
    <Card padding="md" className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          )}
          {description ? (
            <p className="mt-1 text-xs text-subtle">{description}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-lg p-2.5', accentClass)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
