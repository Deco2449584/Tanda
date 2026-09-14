'use client';

import { useState } from 'react';
import { Crosshair, Loader2, ShieldCheck } from 'lucide-react';
import { captureCurrentPosition } from '@/lib/geo/capture-position';
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
} from '@/lib/geo/geofence';
import { isValidLatitude, isValidLongitude } from '@/lib/geo/reverse-geocode';
import type { Location, LocationGeofenceInput } from '@/lib/types/location';

export interface GeofenceFormValue {
  latitude: string;
  longitude: string;
  radius: string;
  required: boolean;
}

export const emptyGeofenceForm: GeofenceFormValue = {
  latitude: '',
  longitude: '',
  radius: String(DEFAULT_GEOFENCE_RADIUS_METERS),
  required: true,
};

export function geofenceFormFromLocation(location: Location): GeofenceFormValue {
  return {
    latitude:
      typeof location.latitude === 'number' ? String(location.latitude) : '',
    longitude:
      typeof location.longitude === 'number' ? String(location.longitude) : '',
    radius: String(
      location.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
    ),
    required: location.geofenceRequired,
  };
}

/** Returns an error message when the coordinates/radius are unusable. */
export function validateGeofenceForm(value: GeofenceFormValue): string | null {
  const latText = value.latitude.trim();
  const lngText = value.longitude.trim();

  if (Boolean(latText) !== Boolean(lngText)) {
    return 'Enter both latitude and longitude, or leave both empty.';
  }

  if (latText && !isValidLatitude(Number(latText))) {
    return 'Latitude must be a number between -90 and 90.';
  }

  if (lngText && !isValidLongitude(Number(lngText))) {
    return 'Longitude must be a number between -180 and 180.';
  }

  const radiusText = value.radius.trim();
  if (radiusText) {
    const radius = Number(radiusText);
    if (
      !Number.isFinite(radius) ||
      radius < MIN_GEOFENCE_RADIUS_METERS ||
      radius > MAX_GEOFENCE_RADIUS_METERS
    ) {
      return `Radius must be between ${MIN_GEOFENCE_RADIUS_METERS} and ${MAX_GEOFENCE_RADIUS_METERS} meters.`;
    }
  }

  if (value.required && !latText) {
    return 'Set the site latitude and longitude before requiring on-site clock-in.';
  }

  return null;
}

export function parseGeofenceForm(
  value: GeofenceFormValue,
): LocationGeofenceInput {
  const latitude = value.latitude.trim() ? Number(value.latitude) : null;
  const longitude = value.longitude.trim() ? Number(value.longitude) : null;
  const hasCoords =
    isValidLatitude(latitude) && isValidLongitude(longitude);
  const radius = value.radius.trim() ? Number(value.radius) : null;

  return {
    latitude: hasCoords ? latitude : null,
    longitude: hasCoords ? longitude : null,
    geofenceRadiusMeters:
      radius !== null && Number.isFinite(radius) ? radius : null,
    geofenceRequired: hasCoords ? value.required : false,
  };
}

interface ClientGeofenceFieldsProps {
  value: GeofenceFormValue;
  onChange: (value: GeofenceFormValue) => void;
  disabled?: boolean;
  onError: (message: string) => void;
  compact?: boolean;
}

export function ClientGeofenceFields({
  value,
  onChange,
  disabled = false,
  onError,
  compact = false,
}: ClientGeofenceFieldsProps) {
  const [locating, setLocating] = useState(false);

  const inputClass =
    'w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 text-sm text-white outline-none focus:border-primary/50' +
    (compact ? ' py-2' : ' py-2.5');

  async function handleUseMyLocation() {
    setLocating(true);
    try {
      const position = await captureCurrentPosition({ timeoutMs: 12_000 });
      if (!position) {
        onError(
          'Could not read your location. Allow location access in the browser and try again.',
        );
        return;
      }
      onChange({
        ...value,
        latitude: position.latitude.toFixed(6),
        longitude: position.longitude.toFixed(6),
      });
    } finally {
      setLocating(false);
    }
  }

  const hasCoords = Boolean(value.latitude.trim() && value.longitude.trim());

  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-base/40 p-3 md:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Site location (geofence)
          </p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-subtle">
            Used to verify QR, NFC, and kiosk punches happen on site. Stand at
            the warehouse and press “Use my location”.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleUseMyLocation()}
          disabled={disabled || locating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="h-3.5 w-3.5" aria-hidden />
          )}
          {locating ? 'Reading GPS…' : 'Use my location'}
        </button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-muted">
            Latitude
          </label>
          <input
            value={value.latitude}
            onChange={(event) =>
              onChange({ ...value, latitude: event.target.value })
            }
            disabled={disabled}
            inputMode="decimal"
            placeholder="-33.865143"
            className={inputClass}
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-muted">
            Longitude
          </label>
          <input
            value={value.longitude}
            onChange={(event) =>
              onChange({ ...value, longitude: event.target.value })
            }
            disabled={disabled}
            inputMode="decimal"
            placeholder="151.209900"
            className={inputClass}
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-muted">
            Radius (m)
          </label>
          <input
            value={value.radius}
            onChange={(event) =>
              onChange({ ...value, radius: event.target.value })
            }
            disabled={disabled}
            inputMode="numeric"
            placeholder={String(DEFAULT_GEOFENCE_RADIUS_METERS)}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={value.required && hasCoords}
          disabled={disabled || !hasCoords}
          onChange={(event) =>
            onChange({ ...value, required: event.target.checked })
          }
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong bg-surface-base accent-primary disabled:opacity-50"
        />
        <span>
          Require on-site location for scan and kiosk clock-in.
          {hasCoords ? null : (
            <span className="text-subtle">
              {' '}
              Add coordinates first to enable this.
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
