import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormSectionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function FormSectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: FormSectionCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
      <div className="flex items-center gap-3 border-b border-border bg-surface-base/40 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-subtle">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-subtle">{hint}</span> : null}
    </label>
  );
}

interface OptionGroupProps<T extends string> {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  hint?: string;
  disabled?: boolean;
}

export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  disabled,
}: OptionGroupProps<T>) {
  return (
    <div>
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold text-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                active
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border-strong bg-surface-base text-muted hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}
