import type { Timestamp } from 'firebase/firestore';
import type { AuLocationState } from '@/lib/locations/au-states';
import type { SiteBilling } from '@/lib/types/pay-rules';

export interface LocationFirestore {
  name: string;
  city: string;
  /** Australian state for Xero Location tracking (NSW, QLD, VIC, …). */
  state?: AuLocationState | string;
  code?: string;
  /** Client / site photo (Firebase Storage download URL). */
  photoUrl?: string;
  active: boolean;
  /** Plaintext PIN for admin display and copy — never exposed on the public portal. */
  pin?: string;
  pinHash?: string;
  /** Session QR/NFC clock-in at this site (employee must be signed in). */
  scanPunchEnabled?: boolean;
  /** Opaque token embedded in /punch/s/{token} — rotate to invalidate stickers. */
  scanPunchToken?: string;
  /** Site position used to validate QR/NFC/kiosk punches are made on site. */
  latitude?: number;
  longitude?: number;
  /** Allowed distance from the site position, in meters. */
  geofenceRadiusMeters?: number;
  /** When true, scan/kiosk punches are rejected without an on-site GPS fix. */
  geofenceRequired?: boolean;
  billing?: SiteBilling;
  billingHistory?: SiteBilling[];
  createdAt?: Timestamp;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  /** Australian state for Xero Location tracking (NSW, QLD, VIC, …). */
  state?: AuLocationState;
  code?: string;
  photoUrl?: string;
  active: boolean;
  pin?: string;
  /** True when pinHash (or plaintext pin) is stored — eligible for portal assignment. */
  hasPortalPin?: boolean;
  scanPunchEnabled?: boolean;
  scanPunchToken?: string;
  /** Site position used to validate QR/NFC/kiosk punches are made on site. */
  latitude?: number;
  longitude?: number;
  /** Allowed distance from the site position, in meters. */
  geofenceRadiusMeters?: number;
  /** True when scan/kiosk punches must happen inside the radius. */
  geofenceRequired: boolean;
  billing?: SiteBilling;
  billingHistory?: SiteBilling[];
  createdAt?: string;
}

export interface LocationGeofenceInput {
  /** Pass a number to set, or null to clear the site position. */
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
  geofenceRequired?: boolean;
}

export interface CreateLocationInput extends LocationGeofenceInput {
  name: string;
  city: string;
  state?: AuLocationState | string;
  code?: string;
  photoUrl?: string;
  /** Required for new clients — 6–8 digit portal PIN. */
  pin: string;
}

export interface UpdateLocationInput extends LocationGeofenceInput {
  name: string;
  city: string;
  state?: AuLocationState | string | null;
  code?: string;
  /** Pass a URL to set/replace, or null to clear. Omit to leave unchanged. */
  photoUrl?: string | null;
}
