/** Browser/CDN cache for immutable WebP assets (avatars, attendance photos). */
export const STORAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const STORAGE_CONTENT_TYPE_WEBP = 'image/webp';

/** Reject huge originals before client-side compression. */
export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
