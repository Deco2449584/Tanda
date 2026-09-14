import { isValidLatitude, isValidLongitude } from '@/lib/geo/reverse-geocode';

export const DEFAULT_GEOFENCE_RADIUS_METERS = 200;
export const MIN_GEOFENCE_RADIUS_METERS = 25;
export const MAX_GEOFENCE_RADIUS_METERS = 5_000;

const EARTH_RADIUS_METERS = 6_371_000;

export interface GeofencePoint {
  latitude: number;
  longitude: number;
}

/** Minimal client/site shape needed to validate an on-site punch. */
export interface GeofenceSite {
  name?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  geofenceRequired?: boolean;
}

export type GeofenceFailureReason =
  | 'site_not_configured'
  | 'gps_required'
  | 'gps_inaccurate'
  | 'outside_radius';

export interface GeofenceCheckResult {
  ok: boolean;
  reason?: GeofenceFailureReason;
  message?: string;
  distanceMeters?: number;
  radiusMeters: number;
  /** True when an enforced geofence was skipped by an employee-level exemption. */
  bypassed?: boolean;
}

export class GeofenceError extends Error {
  reason: GeofenceFailureReason;
  status = 403;
  distanceMeters?: number;
  radiusMeters: number;

  constructor(result: GeofenceCheckResult & { reason: GeofenceFailureReason }) {
    super(result.message ?? 'On-site location could not be verified.');
    this.reason = result.reason;
    this.distanceMeters = result.distanceMeters;
    this.radiusMeters = result.radiusMeters;
  }
}

export function normalizeGeofenceRadiusMeters(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_GEOFENCE_RADIUS_METERS;
  }
  return Math.min(
    MAX_GEOFENCE_RADIUS_METERS,
    Math.max(MIN_GEOFENCE_RADIUS_METERS, Math.round(value)),
  );
}

/**
 * Reads geofence settings off a raw client/location document.
 * Sites with coordinates default to enforcing on-site punches.
 */
export function resolveGeofenceSite(
  data: {
    latitude?: unknown;
    longitude?: unknown;
    geofenceRadiusMeters?: unknown;
    geofenceRequired?: unknown;
  },
  name?: string,
): GeofenceSite {
  const latitude = isValidLatitude(data.latitude) ? data.latitude : undefined;
  const longitude = isValidLongitude(data.longitude)
    ? data.longitude
    : undefined;
  const hasCoords = latitude !== undefined && longitude !== undefined;

  return {
    name,
    latitude,
    longitude,
    geofenceRadiusMeters: normalizeGeofenceRadiusMeters(
      data.geofenceRadiusMeters,
    ),
    geofenceRequired:
      typeof data.geofenceRequired === 'boolean'
        ? data.geofenceRequired
        : hasCoords,
  };
}

export function hasGeofenceCoordinates(site: GeofenceSite): boolean {
  return isValidLatitude(site.latitude) && isValidLongitude(site.longitude);
}

/** True when this site must verify GPS before accepting a punch. */
export function isGeofenceEnforced(site: GeofenceSite): boolean {
  return site.geofenceRequired === true;
}

export function haversineDistanceMeters(
  from: GeofencePoint,
  to: GeofencePoint,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toLat - fromLat;
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatGeofenceDistance(meters: number): string {
  if (meters < 1_000) return `${Math.round(meters)} m`;
  return `${(meters / 1_000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

/** Distance to the site when both the site and the punch have coordinates. */
function measureDistanceToSite(input: {
  site: GeofenceSite;
  latitude?: number;
  longitude?: number;
}): number | undefined {
  if (!hasGeofenceCoordinates(input.site)) return undefined;
  if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
    return undefined;
  }

  return haversineDistanceMeters(
    { latitude: input.site.latitude!, longitude: input.site.longitude! },
    { latitude: input.latitude, longitude: input.longitude },
  );
}

export function evaluateClientGeofence(input: {
  site: GeofenceSite;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  /** Employee works on rotating sites — record the position but skip the check. */
  exempt?: boolean;
}): GeofenceCheckResult {
  const { site } = input;
  const radiusMeters = normalizeGeofenceRadiusMeters(site.geofenceRadiusMeters);
  const siteLabel = site.name?.trim() ? ` for ${site.name.trim()}` : '';
  const enforced = isGeofenceEnforced(site);

  if (input.exempt || !enforced) {
    return {
      ok: true,
      radiusMeters,
      distanceMeters: measureDistanceToSite(input),
      ...(input.exempt && enforced ? { bypassed: true } : {}),
    };
  }

  if (!hasGeofenceCoordinates(site)) {
    return {
      ok: false,
      reason: 'site_not_configured',
      radiusMeters,
      message: `Site location is not configured${siteLabel}. Ask an administrator to set the client coordinates before clocking in.`,
    };
  }

  if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
    return {
      ok: false,
      reason: 'gps_required',
      radiusMeters,
      message:
        'Location is required to clock in here. Enable location for this site in your browser and try again.',
    };
  }

  if (
    typeof input.accuracy === 'number' &&
    Number.isFinite(input.accuracy) &&
    input.accuracy > radiusMeters
  ) {
    return {
      ok: false,
      reason: 'gps_inaccurate',
      radiusMeters,
      message: `Your location is too imprecise (±${Math.round(input.accuracy)} m) to confirm you are on site. Move outdoors or near a window and try again.`,
    };
  }

  const distanceMeters = haversineDistanceMeters(
    { latitude: site.latitude!, longitude: site.longitude! },
    { latitude: input.latitude, longitude: input.longitude },
  );

  if (distanceMeters > radiusMeters) {
    return {
      ok: false,
      reason: 'outside_radius',
      radiusMeters,
      distanceMeters,
      message: `You are ${formatGeofenceDistance(distanceMeters)} away from the site (limit ${radiusMeters} m). Clock in once you are on site.`,
    };
  }

  return { ok: true, radiusMeters, distanceMeters };
}

/** Throws GeofenceError when the punch cannot be proven to be on site. */
export function assertWithinClientGeofence(input: {
  site: GeofenceSite;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}): GeofenceCheckResult {
  const result = evaluateClientGeofence(input);
  if (!result.ok && result.reason) {
    throw new GeofenceError({ ...result, reason: result.reason });
  }
  return result;
}
