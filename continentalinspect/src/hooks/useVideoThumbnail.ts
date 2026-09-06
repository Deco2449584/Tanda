import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';

const thumbnailCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string | null>>();

async function loadVideoThumbnail(videoUrl: string): Promise<string | null> {
  const cached = thumbnailCache.get(videoUrl);
  if (cached) {
    return cached;
  }

  const pending = inflightRequests.get(videoUrl);
  if (pending) {
    return pending;
  }

  const request = VideoThumbnails.getThumbnailAsync(videoUrl, {
    time: 500,
    quality: 0.72,
  })
    .then(({ uri }) => {
      thumbnailCache.set(videoUrl, uri);
      return uri;
    })
    .catch(() => null)
    .finally(() => {
      inflightRequests.delete(videoUrl);
    });

  inflightRequests.set(videoUrl, request);
  return request;
}

export function useVideoThumbnail(videoUrl: string | null | undefined) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(() =>
    videoUrl ? (thumbnailCache.get(videoUrl) ?? null) : null,
  );
  const [isLoading, setIsLoading] = useState(
    () => Boolean(videoUrl) && !thumbnailCache.has(videoUrl),
  );

  useEffect(() => {
    if (!videoUrl) {
      setThumbnailUri(null);
      setIsLoading(false);
      return;
    }

    const cached = thumbnailCache.get(videoUrl);
    if (cached) {
      setThumbnailUri(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadVideoThumbnail(videoUrl)
      .then((uri) => {
        if (!cancelled) {
          setThumbnailUri(uri);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  return { thumbnailUri, isLoadingThumbnail: isLoading };
}
