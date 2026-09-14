'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin, X } from 'lucide-react';
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  normalizeGeofenceRadiusMeters,
} from '@/lib/geo/geofence';
import { isValidLatitude, isValidLongitude } from '@/lib/geo/reverse-geocode';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#ec4899;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapSizeFix() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function ClickPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export interface GeofenceMapPickerProps {
  open: boolean;
  latitude: string;
  longitude: string;
  radius: string;
  disabled?: boolean;
  onClose: () => void;
  onApply: (coords: { latitude: string; longitude: string }) => void;
}

export function GeofenceMapPicker({
  open,
  latitude,
  longitude,
  radius,
  disabled = false,
  onClose,
  onApply,
}: GeofenceMapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const initialLat = Number(latitude);
  const initialLng = Number(longitude);
  const hasInitial =
    isValidLatitude(initialLat) && isValidLongitude(initialLng);

  const [draftLat, setDraftLat] = useState(
    hasInitial ? initialLat : -33.8688,
  );
  const [draftLng, setDraftLng] = useState(
    hasInitial ? initialLng : 151.2093,
  );
  const [mapSession, setMapSession] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isValidLatitude(lat) && isValidLongitude(lng)) {
      setDraftLat(lat);
      setDraftLng(lng);
    }
    setMapSession((value) => value + 1);
  }, [open, latitude, longitude]);

  const radiusMeters = useMemo(
    () =>
      normalizeGeofenceRadiusMeters(
        radius.trim() ? Number(radius) : DEFAULT_GEOFENCE_RADIUS_METERS,
      ),
    [radius],
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close map"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="geofence-map-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div>
            <h2
              id="geofence-map-title"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white"
            >
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              Pick site location
            </h2>
            <p className="mt-1 text-xs text-subtle">
              Tap the map to place the pin. The circle shows the geofence radius (
              {radiusMeters} m).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-[min(58vh,420px)] w-full bg-surface-base">
          <MapContainer
            key={mapSession}
            center={[draftLat, draftLng]}
            zoom={hasInitial ? 17 : 12}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapSizeFix />
            <ClickPicker
              onPick={(lat, lng) => {
                if (disabled) return;
                setDraftLat(lat);
                setDraftLng(lng);
              }}
            />
            <Marker position={[draftLat, draftLng]} icon={pinIcon} />
            <Circle
              center={[draftLat, draftLng]}
              radius={radiusMeters}
              pathOptions={{
                color: '#ec4899',
                fillColor: '#ec4899',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          </MapContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 md:px-5">
          <p className="font-mono text-xs text-muted">
            {draftLat.toFixed(6)}, {draftLng.toFixed(6)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onApply({
                  latitude: draftLat.toFixed(6),
                  longitude: draftLng.toFixed(6),
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden />
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
