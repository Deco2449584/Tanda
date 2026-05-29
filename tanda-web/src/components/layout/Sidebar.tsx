'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Globe,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Control de Tiempos', href: '/control-tiempos', icon: Clock },
  { label: 'Gestión de Personal', href: '/gestion-personal', icon: Users },
  { label: 'Planificación', href: '/planificacion', icon: CalendarDays },
  { label: 'Permisos', href: '/permisos', icon: ShieldCheck },
  { label: 'Configuración', href: '/configuracion', icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-[#121212]">
      <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-5 py-6">
        <div className="relative flex h-9 w-9 items-center justify-center">
          <Globe className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
          <ArrowRight
            className="absolute -right-0.5 bottom-0 h-3.5 w-3.5 text-emerald-500"
            strokeWidth={2.5}
          />
        </div>
        <span className="text-base font-bold tracking-tight text-white">
          Continental Cargo
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
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
  );
}
