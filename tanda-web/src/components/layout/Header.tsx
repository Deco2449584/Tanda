'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  MessageSquare,
  UserCircle,
} from 'lucide-react';
import { useSignOut } from '@/hooks/useSignOut';
import { auth } from '@/lib/firebase';

const DEFAULT_PROFILE_NAME = 'Admin Daniel G.';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [profileName, setProfileName] = useState(DEFAULT_PROFILE_NAME);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOutUser, signingOut } = useSignOut();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setProfileName(user?.email ?? DEFAULT_PROFILE_NAME);
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 bg-[#0a0a0a]/80 px-4 backdrop-blur-sm md:h-16 md:gap-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Image
          src="/logo.svg"
          alt="Continental Cargo"
          width={180}
          height={56}
          className="h-12 w-auto object-contain md:hidden"
          priority
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100 sm:inline-flex"
          aria-label="Messages"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0a0a0a]" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-1 text-zinc-100 transition-colors hover:bg-zinc-800/60 md:pl-2"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <UserCircle className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
            <span className="hidden max-w-[180px] truncate text-sm font-medium sm:inline">
              {profileName}
            </span>
            <ChevronDown
              className={`hidden h-4 w-4 text-zinc-500 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl"
            >
              <p className="truncate px-3 py-2 text-xs text-zinc-500">{profileName}</p>
              <div className="my-1 border-t border-zinc-800" />
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
