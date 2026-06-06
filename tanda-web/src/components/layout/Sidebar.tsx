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
import { CompanyLogo } from '@/components/ui/CompanyLogo';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Time & Attendance', href: '/attendance', icon: Clock },
  { label: 'Staff Management', href: '/employees', icon: Users },
  { label: 'Schedule', href: '/schedule', icon: CalendarDays },
  { label: 'Leave Requests', href: '/leave-requests', icon: ShieldCheck },
  { label: 'Inspections', href: '/inspections', icon: PackageSearch },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const employeeNavItems: NavItem[] = [
  { label: 'My Dashboard', href: '/employee-dashboard', icon: LayoutDashboard },
  { label: 'My Records', href: '/my-records', icon: ClipboardList },
  { label: 'My Schedule', href: '/my-schedule', icon: CalendarDays },
  { label: 'My Leave', href: '/my-requests', icon: ShieldCheck },
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
  const navItems = role === 'admin' ? adminNavItems : employeeNavItems;

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
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-[#121212] transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative mb-4 flex w-full items-center justify-center border-b border-zinc-800 px-3 py-10">
          <CompanyLogo
            className="h-28 w-full max-w-[220px] object-contain brightness-0 invert drop-shadow-md md:h-32 md:max-w-[240px]"
            priority
            invert
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-6 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800/60 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : ''}`}
                  strokeWidth={1.75}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
