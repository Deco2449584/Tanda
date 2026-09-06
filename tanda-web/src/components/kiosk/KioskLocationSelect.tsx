'use client';

import { MapPin } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import type { KioskLocationOption } from '@/lib/types/kiosk-context';

interface KioskLocationSelectProps {
  locations: KioskLocationOption[];
  onSelect: (locationId: string) => void;
}

export function KioskLocationSelect({
  locations,
  onSelect,
}: KioskLocationSelectProps) {
  return (
    <div className="kiosk-ambient flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 text-center text-white">
      <CompanyLogo variant="light" className="h-auto w-40 object-contain opacity-90" />
      <div className="mt-6 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md">
        <MapPin className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-lg font-semibold">Select client</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose the client this tablet is punching for. You can change it later
          from settings.
        </p>
        <div className="mt-5 space-y-2">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => onSelect(location.id)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm font-medium text-white transition hover:border-primary/40 hover:bg-white/[0.06]"
            >
              <span>{location.name}</span>
              {location.city ? (
                <span className="text-xs text-zinc-400">{location.city}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
