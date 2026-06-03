'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

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
      <label className="mb-1.5 block text-sm text-zinc-400">Profile photo</label>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 ring-2 ring-zinc-700">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-7 w-7 text-zinc-500" aria-hidden />
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:opacity-90 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
