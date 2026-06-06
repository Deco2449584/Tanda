'use client';

import { useState } from 'react';

interface InspectionVideoGalleryProps {
  videos: string[];
}

export function InspectionVideoGallery({ videos }: InspectionVideoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (videos.length === 0) {
    return (
      <p className="text-sm italic text-zinc-500">No videos attached.</p>
    );
  }

  const activeVideo = videos[activeIndex] ?? videos[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <video
          key={activeVideo}
          src={activeVideo}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
        >
          Your browser does not support video playback.
        </video>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Clip {activeIndex + 1} / {videos.length}
      </p>

      {videos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {videos.map((video, index) => (
            <button
              key={`${video}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                index === activeIndex
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              Clip {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
