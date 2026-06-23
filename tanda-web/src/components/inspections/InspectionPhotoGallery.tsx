'use client';

import { useState } from 'react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionPhotoGalleryProps {
  photos: string[];
}

export function InspectionPhotoGallery({ photos }: InspectionPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <p className="text-sm italic text-subtle">No photos attached.</p>
    );
  }

  const activePhoto = photos[activeIndex] ?? photos[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-surface-base">
        <FirebaseImage
          src={activePhoto}
          alt={`Photo evidence ${activeIndex + 1}`}
          width={960}
          height={540}
          className="aspect-video w-full object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
          quality={80}
        />
      </div>

      <p className="text-center text-xs text-subtle">
        {activeIndex + 1} / {photos.length}
      </p>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                index === activeIndex
                  ? 'border-primary'
                  : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              <FirebaseImage
                src={photo}
                alt={`Thumbnail ${index + 1}`}
                width={80}
                height={56}
                className="h-14 w-20 object-cover"
                sizes="80px"
                quality={65}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
