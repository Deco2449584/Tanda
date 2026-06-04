interface ForgottenCheckoutBadgeProps {
  compact?: boolean;
}

export function ForgottenCheckoutBadge({ compact = false }: ForgottenCheckoutBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full bg-orange-500/15 font-semibold leading-tight text-orange-400 ${
        compact
          ? 'px-1.5 py-0.5 text-[10px]'
          : 'max-w-[220px] px-2.5 py-1 text-[11px]'
      }`}
    >
      {compact ? 'Pending checkout' : 'Forgotten Checkout / Pending Adjustment'}
    </span>
  );
}
