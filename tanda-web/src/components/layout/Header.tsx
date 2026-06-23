'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { AdminNotificationsMenu } from '@/components/layout/AdminNotificationsMenu';
import { EmployeeNotificationsMenu } from '@/components/layout/EmployeeNotificationsMenu';
import { useSignOut } from '@/hooks/useSignOut';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/lib/auth/roles';

const DEFAULT_PROFILE_NAME = 'Admin';

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0] ?? '';
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

interface HeaderProps {
  onMenuClick?: () => void;
  role?: UserRole;
}

export function Header({ onMenuClick, role }: HeaderProps) {
  const [profileName, setProfileName] = useState(DEFAULT_PROFILE_NAME);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOutUser, signingOut } = useSignOut();

  const initials = useMemo(() => getInitials(profileName), [profileName]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const display = user?.displayName?.trim() || user?.email || DEFAULT_PROFILE_NAME;
      setProfileName(display);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOutUser();
  }

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-base/80 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-2 text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="hidden min-w-0 flex-1 md:block" />

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {role === 'admin' ? <AdminNotificationsMenu enabled /> : null}
        {role === 'empleado' ? <EmployeeNotificationsMenu /> : null}

        <div className="relative z-[100]" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-foreground transition-colors duration-150 hover:bg-surface-hover"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary"
              aria-hidden
            >
              {initials}
            </span>
            <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
              {profileName.includes('@') ? profileName.split('@')[0] : profileName}
            </span>
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-subtle transition-transform sm:block',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-[100] mt-2 w-52 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-xl"
            >
              <p className="truncate px-3 py-2 text-xs text-subtle">{profileName}</p>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger transition-colors duration-150 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
