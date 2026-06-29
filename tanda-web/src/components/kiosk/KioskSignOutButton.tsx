'use client';

import { Loader2, LogOut } from 'lucide-react';

interface KioskSignOutButtonProps {
  onSignOut: () => void | Promise<void>;
  signingOut?: boolean;
  className?: string;
  variant?: 'subtle' | 'prominent';
}

export function KioskSignOutButton({
  onSignOut,
  signingOut = false,
  className = '',
  variant = 'subtle',
}: KioskSignOutButtonProps) {
  if (variant === 'prominent') {
    return (
      <button
        type="button"
        disabled={signingOut}
        onClick={() => void onSignOut()}
        className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] text-sm font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:opacity-60 ${className}`}
      >
        {signingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => void onSignOut()}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur transition hover:border-white/20 hover:text-white disabled:opacity-60 ${className}`}
    >
      {signingOut ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
