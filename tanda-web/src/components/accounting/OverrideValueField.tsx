'use client';

const selectClass =
  'shrink-0 rounded-lg border border-border-strong bg-surface-base px-2 py-2 text-xs text-muted outline-none focus:border-primary disabled:opacity-50';

const inputClass =
  'w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';

export type OverrideMode = 'default' | 'custom';

interface OverrideValueFieldProps {
  disabled?: boolean;
  mode: OverrideMode;
  onModeChange: (mode: OverrideMode) => void;
  value: number | '';
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  defaultOptionLabel?: string;
  customOptionLabel?: string;
  min?: number;
  step?: string;
}

export function OverrideValueField({
  disabled = false,
  mode,
  onModeChange,
  value,
  onValueChange,
  placeholder = '',
  defaultOptionLabel = 'Default',
  customOptionLabel = 'Edit',
  min = 0,
  step = '0.01',
}: OverrideValueFieldProps) {
  const isCustom = mode === 'custom';

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
      <select
        disabled={disabled}
        value={mode}
        onChange={(event) => onModeChange(event.target.value as OverrideMode)}
        className={selectClass}
        aria-label="Override mode"
      >
        <option value="default">{defaultOptionLabel}</option>
        <option value="custom">{customOptionLabel}</option>
      </select>
      <input
        type="number"
        min={min}
        step={step}
        inputMode="decimal"
        disabled={disabled || !isCustom}
        value={isCustom ? value : ''}
        placeholder={isCustom ? placeholder : defaultOptionLabel}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === '') {
            onValueChange(null);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          onValueChange(parsed);
        }}
        className={inputClass}
      />
    </div>
  );
}
