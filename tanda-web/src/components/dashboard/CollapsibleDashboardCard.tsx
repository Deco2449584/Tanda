'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface CollapsibleDashboardCardProps {
  title: string;
  description?: string;
  /** One-line recap shown while collapsed, for cards without insights. */
  summary?: string;
  /** Headline facts shown above the chart, and while collapsed. */
  insights?: React.ReactNode;
  /** Chart-specific controls (sort, top N, chart type). */
  toolbar?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleDashboardCard({
  title,
  description,
  summary,
  insights,
  toolbar,
  collapsed,
  onToggle,
  children,
  className,
}: CollapsibleDashboardCardProps) {
  return (
    <Card padding="md" className={cn('backdrop-blur-sm', className)}>
      <CardHeader className="mb-0 gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && !collapsed ? (
              <CardDescription className="mt-1">{description}</CardDescription>
            ) : null}
            {collapsed && summary && !insights ? (
              <p className="mt-1 truncate text-sm text-muted">{summary}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!collapsed && toolbar ? toolbar : null}
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-expanded={!collapsed}
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  Collapse
                </>
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      {insights ? <div className="mt-4">{insights}</div> : null}

      {!collapsed ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
