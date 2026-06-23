import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary/90 focus-visible:ring-primary/50',
  secondary:
    'border border-border-strong bg-surface-raised text-foreground hover:bg-surface-hover focus-visible:ring-primary/30',
  ghost:
    'text-muted hover:bg-surface-hover hover:text-foreground focus-visible:ring-primary/30',
  danger:
    'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger/30',
  icon: 'text-muted hover:bg-surface-hover hover:text-foreground focus-visible:ring-primary/30',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
