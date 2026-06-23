'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutDashboard,
  PackageSearch,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth/roles';
import { cn } from '@/lib/cn';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Attendance', href: '/attendance', icon: Clock },
      { label: 'Schedule', href: '/schedule', icon: CalendarDays },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', href: '/employees', icon: Users },
      { label: 'Leave requests', href: '/leave-requests', icon: ShieldCheck },
    ],
  },
  {
    title: 'Compliance',
    items: [{ label: 'Inspections', href: '/inspections', icon: PackageSearch }],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
];

const employeeNavGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'My dashboard', href: '/employee-dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'My work',
    items: [
      { label: 'My records', href: '/my-records', icon: ClipboardList },
      { label: 'My schedule', href: '/my-schedule', icon: CalendarDays },
      { label: 'My leave', href: '/my-requests', icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  role: UserRole;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname() ?? '';
  const navGroups = role === 'admin' ? adminNavGroups : employeeNavGroups;
  const roleLabel = role === 'admin' ? 'Administrator' : 'Employee';

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface-sidebar transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <CompanyLogo
            className="h-8 w-auto max-w-[160px] object-contain brightness-0 invert"
            priority
            invert
          />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = isActive(pathname, href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                        active
                          ? 'bg-surface-raised text-primary'
                          : 'text-muted hover:bg-surface-hover hover:text-foreground',
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : '')}
                        strokeWidth={1.75}
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-subtle">Continental Cargo</p>
          <p className="text-xs text-muted">{roleLabel}</p>
        </div>
      </aside>
    </>
  );
}
