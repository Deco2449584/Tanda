import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-surface-base px-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
        hasError ? 'border-danger/50' : 'border-border-strong',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
