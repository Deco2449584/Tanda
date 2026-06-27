'use client';

import { MapPin } from 'lucide-react';
import { buildGoogleMapsUrl } from '@/lib/attendance/location-display';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface AttendanceMapLinkProps {
  record: AttendanceRecord;
  compact?: boolean;
}

export function AttendanceMapLink({ record, compact = false }: AttendanceMapLinkProps) {
  const mapsUrl = buildGoogleMapsUrl(record);

  if (!mapsUrl) {
    return (
      <span className={compact ? 'text-[11px] text-subtle' : 'text-xs text-subtle'}>
        No map location
      </span>
    );
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        compact
          ? 'inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline'
          : 'inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline'
      }
      title="Open punch location in Google Maps"
    >
      <MapPin className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      View on map
    </a>
  );
}
