'use client';

import type { LucideIcon } from 'lucide-react';

export const formInputClass =
  'w-full rounded-xl border border-border-strong/80 bg-surface-base/90 px-3.5 py-3 text-sm text-foreground shadow-inner shadow-black/10 outline-none transition placeholder:text-muted/80 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

export const formSelectClass = `${formInputClass} appearance-none`;

export function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-surface-raised to-surface-base/20 shadow-sm">
      <div className="border-b border-border/60 bg-surface-raised/90 px-5 py-4 md:px-6">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-subtle">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5 md:p-6">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-foreground/90">
        {label}
        {required ? <span className="ml-1 text-red-400">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs leading-relaxed text-subtle">{hint}</p> : null}
    </div>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

export function FormToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-surface-base/50 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-subtle">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={checked ? `${label} enabled` : `${label} disabled`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function FormAlert({
  variant,
  children,
}: {
  variant: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const styles =
    variant === 'error'
      ? 'border-red-900/50 bg-red-950/30 text-red-300'
      : variant === 'success'
        ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300'
        : 'border-primary/30 bg-primary/5 text-subtle';

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export function FormActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancel',
  disabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 rounded-2xl border border-border/80 bg-surface-raised/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-border-strong px-5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitLabel}
      </button>
    </div>
  );
}
