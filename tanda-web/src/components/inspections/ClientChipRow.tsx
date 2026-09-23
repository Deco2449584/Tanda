'use client';

import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { isFirebaseStorageUrl } from '@/utils/imageOptimizer';
import type { Location } from '@/lib/types/location';

export function ClientChipRow({
  clients,
  selectedId,
  onChange,
}: {
  clients: Location[];
  selectedId: string;
  onChange: (client: Location | null) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-foreground">Client</p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {clients.map((client) => {
          const selected = client.id === selectedId;
          const initial = client.name.trim().slice(0, 1).toUpperCase() || 'C';
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => onChange(selected ? null : client)}
              className={`inline-flex max-w-[220px] shrink-0 items-center gap-2 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-2.5 text-left transition ${
                selected
                  ? 'border-primary bg-surface-raised'
                  : 'border-transparent bg-surface-hover hover:border-primary/40'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[11px] font-semibold text-white">
                {client.photoUrl ? (
                  isFirebaseStorageUrl(client.photoUrl) ? (
                    <FirebaseImage
                      src={client.photoUrl}
                      alt={client.name}
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                      sizes="28px"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={client.photoUrl}
                      alt={client.name}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  initial
                )}
              </span>
              <span className="truncate text-[13px] font-semibold text-foreground">
                {client.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
