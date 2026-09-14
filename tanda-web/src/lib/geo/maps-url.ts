/** Google Maps pin URL for a lat/lng pair. */
export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/** OpenStreetMap view centered on a lat/lng pair. */
export function buildOpenStreetMapUrl(
  latitude: number,
  longitude: number,
  zoom = 17,
): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}
