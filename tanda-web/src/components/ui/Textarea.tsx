import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
