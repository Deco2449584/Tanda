'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { AdminNotificationsMenu } from '@/components/layout/AdminNotificationsMenu';
import { EmployeeNotificationsMenu } from '@/components/layout/EmployeeNotificationsMenu';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { useSignOut } from '@/hooks/useSignOut';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/lib/auth/roles';
import { isAdminAreaRole } from '@/lib/auth/roles';

const DEFAULT_PROFILE_NAME = 'Admin';

interface HeaderProps {
  onMenuClick?: () => void;
  role?: UserRole;
}

export function Header({ onMenuClick, role }: HeaderProps) {
  const [profileName, setProfileName] = useState(DEFAULT_PROFILE_NAME);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOutUser, signingOut } = useSignOut();
  const { employee } = useCurrentEmployee(userEmail);

  const displayName = employee?.name?.trim() || profileName;

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const display = user?.displayName?.trim() || user?.email || DEFAULT_PROFILE_NAME;
      setProfileName(display);
      setUserEmail(user?.email ?? null);
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
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-base/80 px-4 backdrop-blur-sm">
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
        {isAdminAreaRole(role ?? 'empleado') ? <AdminNotificationsMenu enabled /> : null}
        {role === 'empleado' ? <EmployeeNotificationsMenu /> : null}

        <div className="relative z-[100]" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-foreground transition-colors duration-150 hover:bg-surface-hover"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <EmployeeAvatar
              name={displayName}
              photoUrl={employee?.photoUrl}
              size="sm"
            />
            <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
              {displayName.includes('@') ? displayName.split('@')[0] : displayName}
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
              <p className="truncate px-3 py-2 text-xs text-subtle">{displayName}</p>
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
