'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth/roles';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Control de Tiempos', href: '/attendance', icon: Clock },
  { label: 'Gestión de Personal', href: '/employees', icon: Users },
  { label: 'Planificación', href: '/schedule', icon: CalendarDays },
  { label: 'Permisos', href: '/leave-requests', icon: ShieldCheck },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

const employeeNavItems: NavItem[] = [
  { label: 'Mi Resumen General', href: '/employee-dashboard', icon: LayoutDashboard },
  { label: 'Mi Horario', href: '/my-schedule', icon: CalendarDays },
  { label: 'Mis Permisos', href: '/my-requests', icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  role: UserRole;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === 'admin' ? adminNavItems : employeeNavItems;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-[#121212] transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 px-5 py-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Continental Cargo"
              width={120}
              height={32}
              className="h-8 w-auto shrink-0"
              priority
            />
            <span className="hidden text-base font-bold tracking-tight text-white sm:inline">
              Continental Cargo
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 md:hidden"
            aria-label="Cerrar menú lateral"
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
                    ? 'bg-emerald-600/20 text-emerald-400 backdrop-blur-sm'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-500' : ''}`}
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
