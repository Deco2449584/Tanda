'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import type { CompanySettings } from '@/lib/types/company-settings';

interface IdentityBrandingTabProps {
  draft: CompanySettings;
  saving: boolean;
  onChange: (next: CompanySettings) => void;
  onUploadLogo: (file: File) => Promise<void>;
  onSave: () => void;
}

export function IdentityBrandingTab({
  draft,
  saving,
  onChange,
  onUploadLogo,
  onSave,
}: IdentityBrandingTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      await onUploadLogo(file);
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
      <h2 className="text-sm font-semibold text-white">Identity & branding</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Company name, logo, and brand colors applied across the app and kiosk.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="company-name" className="mb-1.5 block text-sm text-zinc-400">
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            value={draft.companyName}
            onChange={(e) => onChange({ ...draft, companyName: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-zinc-400">Logo preview</p>
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <CompanyLogo className="h-14 w-auto max-w-[200px] object-contain brightness-0 invert" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-zinc-400">Upload logo</p>
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 bg-zinc-950/30 px-6 py-8 transition hover:border-primary/40 hover:bg-zinc-900/50"
          >
            <Upload className="h-8 w-8 text-zinc-500" />
            <p className="text-sm text-zinc-300">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-zinc-500">PNG, JPG or SVG — max 5 MB</p>
            {uploading ? (
              <p className="text-xs text-primary">Uploading logo…</p>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="primary-color" className="mb-1.5 block text-sm text-zinc-400">
              Primary color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="primary-color"
                type="color"
                value={draft.primaryColor}
                onChange={(e) =>
                  onChange({ ...draft, primaryColor: e.target.value })
                }
                className="h-10 w-14 cursor-pointer rounded border border-zinc-700 bg-transparent"
              />
              <input
                type="text"
                value={draft.primaryColor}
                onChange={(e) =>
                  onChange({ ...draft, primaryColor: e.target.value })
                }
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm font-mono text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label htmlFor="secondary-color" className="mb-1.5 block text-sm text-zinc-400">
              Secondary color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="secondary-color"
                type="color"
                value={draft.secondaryColor}
                onChange={(e) =>
                  onChange({ ...draft, secondaryColor: e.target.value })
                }
                className="h-10 w-14 cursor-pointer rounded border border-zinc-700 bg-transparent"
              />
              <input
                type="text"
                value={draft.secondaryColor}
                onChange={(e) =>
                  onChange({ ...draft, secondaryColor: e.target.value })
                }
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm font-mono text-zinc-100"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || uploading}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save branding'}
        </button>
      </div>
    </section>
  );
}
