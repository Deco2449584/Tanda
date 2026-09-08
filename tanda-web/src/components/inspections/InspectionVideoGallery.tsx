'use client';

import { useState } from 'react';
import { Download, ExternalLink, Film, Loader2 } from 'lucide-react';

export interface VideoDownloadRequest {
  url: string;
  headers?: HeadersInit;
}

interface InspectionVideoGalleryProps {
  videos: string[];
  /** `link` opens the signed URL in a new tab (portal). `download` fetches via proxy or direct URL. */
  accessMode?: 'download' | 'link';
  /** Visual theme. Portal dark surfaces should pass `dark`. */
  theme?: 'light' | 'dark';
  resolveDownloadRequest?: (
    index: number,
    url: string,
  ) => VideoDownloadRequest;
}

function videoFileName(url: string, index: number): string {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const segment = pathname.split('/').pop()?.split('?')[0];
    if (segment && segment.length > 0) {
      return segment;
    }
  } catch {
    // fall through
  }
  return `inspection-video-${index + 1}.mp4`;
}

/** Prefer first frame via media fragment when the URL has no query. */
function videoPreviewSrc(url: string): string {
  if (!url || url.includes('#')) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.search) {
      return `${url}#t=0.1`;
    }
  } catch {
    return `${url}#t=0.1`;
  }
  return url;
}

function VideoPreview({
  url,
  label,
  large = false,
}: {
  url: string;
  label: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const previewSrc = videoPreviewSrc(url);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#1a1a1a] ${
          large ? 'aspect-video w-full min-h-[200px]' : 'h-14 w-20'
        }`}
      >
        <Film
          className={large ? 'h-10 w-10 text-[#F51EA0]/70' : 'h-5 w-5 text-[#F51EA0]/60'}
          aria-hidden
        />
        {large ? (
          <p className="mt-3 max-w-[90%] truncate px-4 text-center text-xs text-white/50">
            {label}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <video
      src={previewSrc}
      preload="metadata"
      controls={large}
      muted={!large}
      playsInline
      onError={() => setFailed(true)}
      className={
        large
          ? 'aspect-video w-full bg-black object-contain'
          : 'h-14 w-20 bg-black object-cover'
      }
      aria-label={label}
    />
  );
}

async function downloadVideo(
  url: string,
  fileName: string,
  headers?: HeadersInit,
): Promise<void> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Download failed.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function InspectionVideoGallery({
  videos,
  accessMode = 'download',
  theme,
  resolveDownloadRequest,
}: InspectionVideoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const isLinkMode = accessMode === 'link';
  const isDark = (theme ?? (isLinkMode ? 'light' : 'dark')) === 'dark';

  if (videos.length === 0) {
    return (
      <p className={`text-sm italic ${isDark ? 'text-white/50' : 'text-subtle'}`}>
        No videos attached.
      </p>
    );
  }

  const activeVideo = videos[activeIndex] ?? videos[0];
  const activeLabel = videoFileName(activeVideo, activeIndex);
  const isDownloading = downloadingIndex === activeIndex;

  async function handleDownload(index: number) {
    const url = videos[index];
    if (!url) return;

    setDownloadError('');
    setDownloadingIndex(index);

    try {
      const request = resolveDownloadRequest?.(index, url) ?? { url };
      await downloadVideo(
        request.url,
        videoFileName(url, index),
        request.headers,
      );
    } catch {
      setDownloadError('Could not download this video. Please try again.');
    } finally {
      setDownloadingIndex(null);
    }
  }

  const frameClass = isDark
    ? 'overflow-hidden rounded-xl border border-white/15 bg-black'
    : 'overflow-hidden rounded-xl border border-slate-200 bg-slate-50';

  const actionClass = isDark
    ? 'inline-flex items-center gap-2 rounded-lg border border-[#F51EA0]/50 bg-[#F51EA0] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d4198a]'
    : 'inline-flex items-center gap-2 rounded-lg border border-[#262626]/25 bg-[#262626] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1a1a1a]';

  const metaClass = isDark ? 'text-white/55' : 'text-slate-500';

  return (
    <div className="space-y-3">
      <div className={frameClass}>
        <VideoPreview url={activeVideo} label={activeLabel} large />
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <p className={`text-xs ${metaClass}`}>
          Clip {activeIndex + 1} / {videos.length}
        </p>
        {isLinkMode ? (
          <a
            href={activeVideo}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Open video
          </a>
        ) : (
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => void handleDownload(activeIndex)}
            className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
            Download video
          </button>
        )}
      </div>

      {downloadError ? (
        <p className="text-center text-xs text-red-400">{downloadError}</p>
      ) : null}

      {videos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {videos.map((video, index) => (
            <button
              key={`${video}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Select clip ${index + 1}`}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                index === activeIndex
                  ? 'border-[#F51EA0]'
                  : isDark
                    ? 'border-white/15 opacity-70 hover:opacity-100'
                    : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <VideoPreview
                url={video}
                label={videoFileName(video, index)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
