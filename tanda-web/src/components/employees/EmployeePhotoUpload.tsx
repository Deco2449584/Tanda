'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { isFirebaseStorageUrl, validateImageFile } from '@/utils/imageOptimizer';

interface EmployeePhotoUploadProps {
  currentPhotoUrl?: string;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function EmployeePhotoUpload({
  currentPhotoUrl,
  selectedFile,
  onFileChange,
  disabled = false,
}: EmployeePhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const displayUrl = previewUrl || currentPhotoUrl || null;

  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted">Profile photo</label>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-hover ring-2 ring-zinc-700">
          {displayUrl ? (
            isFirebaseStorageUrl(displayUrl) ? (
              <FirebaseImage
                src={displayUrl}
                alt="Preview"
                width={64}
                height={64}
                className="h-full w-full object-cover"
                sizes="64px"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt="Preview"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            )
          ) : (
            <User className="h-7 w-7 text-subtle" aria-hidden />
          )}
        </div>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file) {
              const error = validateImageFile(file);
              if (error) {
                window.alert(error);
                e.target.value = '';
                return;
              }
            }
            onFileChange(file);
          }}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:opacity-90 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
