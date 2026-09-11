'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Archive,
  ScanLine,
  Search,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Highlighted call to action in the middle of the bar. */
  accent?: boolean;
}

const TABS: TabItem[] = [
  { href: '/inspect', label: 'Records', icon: Archive },
  { href: '/inspect/search', label: 'Search', icon: Search },
  { href: '/inspect/new', label: 'Scan', icon: ScanLine, accent: true },
  { href: '/inspect/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
  { href: '/inspect/account', label: 'Account', icon: User },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/inspect') {
    return pathname === '/inspect';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InspectTabBar({ isInspectAdmin }: { isInspectAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => !tab.adminOnly || isInspectAdmin);

  return (
    <nav
      aria-label="Continental Inspect"
      className="sticky bottom-0 z-20 border-t border-border bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-subtle hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-lg transition-colors',
                    active && 'bg-primary/15',
                    tab.accent && !active && 'bg-surface-hover',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
