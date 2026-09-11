'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { DASHBOARD_CATEGORY_LABELS } from '@/lib/dashboard/dashboard-widgets';
import type { DashboardWidgetDefinition } from '@/lib/dashboard/types';

interface DashboardCustomizeDialogProps {
  open: boolean;
  onClose: () => void;
  widgets: DashboardWidgetDefinition[];
  visibleWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onShowAll: () => void;
  onReset: () => void;
}

export function DashboardCustomizeDialog({
  open,
  onClose,
  widgets,
  visibleWidgets,
  onToggleWidget,
  onShowAll,
  onReset,
}: DashboardCustomizeDialogProps) {
  const visibleSet = new Set(visibleWidgets);

  const categories = Array.from(
    new Set(widgets.map((widget) => widget.category)),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Customize dashboard"
      description="Choose which analytics cards to show. Reset restores the recommended defaults."
      size="lg"
    >
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryWidgets = widgets.filter(
            (widget) => widget.category === category,
          );

          return (
            <section key={category}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {DASHBOARD_CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-2">
                {categoryWidgets.map((widget) => {
                  const checked = visibleSet.has(widget.id);

                  return (
                    <label
                      key={widget.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-surface-hover"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleWidget(widget.id)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {widget.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {widget.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}

        {widgets.length === 0 ? (
          <p className="text-sm text-muted">No widgets available for your role.</p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Reset to defaults
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onShowAll}>
            Show all widgets
          </Button>
          <Button type="button" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
