'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Bell,
  ChevronDown,
  MessageSquare,
  Search,
  UserCircle,
} from 'lucide-react';
import { auth } from '@/lib/firebase';

const DEFAULT_PROFILE_NAME = 'Admin Daniel G.';

export function Header() {
  const [profileName, setProfileName] = useState(DEFAULT_PROFILE_NAME);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setProfileName(user?.email ?? DEFAULT_PROFILE_NAME);
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-[#0a0a0a]/80 px-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Buscar"
          readOnly
          className="w-full cursor-default rounded-lg border border-zinc-800/60 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-300 placeholder:text-zinc-500 outline-none"
          aria-label="Buscar"
        />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          aria-label="Mensajes"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0a0a0a]" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-1 text-zinc-100 transition-colors hover:bg-zinc-800/60"
        >
          <UserCircle className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
          <span className="hidden max-w-[180px] truncate text-sm font-medium sm:inline">
            {profileName}
          </span>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </button>
      </div>
    </header>
  );
}
