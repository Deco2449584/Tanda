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

function VideoThumbnail({
  label,
  large = false,
  light = false,
}: {
  label: string;
  large?: boolean;
  light?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        light
          ? 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'
          : 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900'
      } ${large ? 'aspect-video w-full min-h-[180px]' : 'h-14 w-20'}`}
    >
      <Film
        className={
          light
            ? large
              ? 'h-12 w-12 text-[#262626]/50'
              : 'h-5 w-5 text-[#262626]/40'
            : large
              ? 'h-12 w-12 text-primary/70'
              : 'h-5 w-5 text-primary/60'
        }
        aria-hidden
      />
      {large ? (
        <p
          className={`mt-3 max-w-[90%] truncate px-4 text-center text-xs ${
            light ? 'text-slate-500' : 'text-subtle'
          }`}
        >
          {label}
        </p>
      ) : null}
    </div>
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
  resolveDownloadRequest,
}: InspectionVideoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const isLinkMode = accessMode === 'link';
  const isLight = isLinkMode;

  if (videos.length === 0) {
    return (
      <p className="text-sm italic text-subtle">No videos attached.</p>
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

  const frameClass = isLight
    ? 'overflow-hidden rounded-xl border border-slate-200 bg-slate-50'
    : 'overflow-hidden rounded-xl border border-border bg-surface-base';

  const actionClass = isLight
    ? 'inline-flex items-center gap-2 rounded-lg border border-[#262626]/25 bg-[#262626]/5 px-4 py-2 text-xs font-semibold text-[#262626] transition hover:bg-[#262626]/10'
    : 'inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-3">
      <div className={frameClass}>
        <VideoThumbnail label={activeLabel} large light={isLight} />
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-subtle'}`}>
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
            className={actionClass}
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
                  ? isLight
                    ? 'border-[#262626]'
                    : 'border-primary'
                  : isLight
                    ? 'border-slate-200 opacity-70 hover:opacity-100'
                    : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              <VideoThumbnail label={videoFileName(video, index)} light={isLight} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
