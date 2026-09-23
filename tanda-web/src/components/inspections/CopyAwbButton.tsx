'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyAwbButton({
  awbNumber,
  value,
  label = 'Copy',
  className = '',
  variant = 'default',
  iconOnly = false,
}: {
  awbNumber?: string;
  value?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'onDark';
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = (value ?? awbNumber ?? '').trim();

  if (!text) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const tone =
    variant === 'onDark'
      ? iconOnly
        ? 'text-white/70 hover:bg-white/10 hover:text-white'
        : 'border-white/25 text-white/80 hover:border-white/50 hover:text-white'
      : iconOnly
        ? 'text-muted hover:bg-surface-hover hover:text-primary'
        : 'border-border-strong text-muted hover:border-primary/40 hover:text-primary';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleCopy();
      }}
      className={
        iconOnly
          ? `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${tone} ${className}`
          : `inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${tone} ${className}`
      }
      aria-label={`${copied ? 'Copied' : label} ${text}`}
      title={copied ? 'Copied' : label}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {iconOnly ? null : copied ? 'Copied' : label}
    </button>
  );
}
