'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyAwbButton({
  awbNumber,
  className = '',
  variant = 'default',
}: {
  awbNumber: string;
  className?: string;
  variant?: 'default' | 'onDark';
}) {
  const [copied, setCopied] = useState(false);
  const value = awbNumber.trim();

  if (!value) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const tone =
    variant === 'onDark'
      ? 'border-white/25 text-white/80 hover:border-white/50 hover:text-white'
      : 'border-border-strong text-muted hover:border-primary/40 hover:text-primary';

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${tone} ${className}`}
      aria-label={`Copy AWB ${value}`}
      title="Copy AWB"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
