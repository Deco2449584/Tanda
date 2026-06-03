'use client';

export interface CompanySettings {
  companyName: string;
  timezone: string;
  checkInDeadline: string;
}

interface CompanySettingsCardProps {
  settings: CompanySettings;
  saving: boolean;
  onChange: (settings: CompanySettings) => void;
  onSave: () => void;
}

export function CompanySettingsCard({
  settings,
  saving,
  onChange,
  onSave,
}: CompanySettingsCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm md:p-6">
      <h2 className="text-sm font-semibold text-white">Company settings</h2>
      <p className="mt-1 text-xs text-zinc-500">
        General environment configuration (local storage for now).
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="company-name"
            className="mb-1.5 block text-sm text-zinc-400"
          >
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            value={settings.companyName}
            onChange={(event) =>
              onChange({ ...settings, companyName: event.target.value })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-primary/50"
          />
        </div>

        <div>
          <label
            htmlFor="company-timezone"
            className="mb-1.5 block text-sm text-zinc-400"
          >
            Time zone
          </label>
          <input
            id="company-timezone"
            type="text"
            value={settings.timezone}
            onChange={(event) =>
              onChange({ ...settings, timezone: event.target.value })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-primary/50"
          />
        </div>

        <div>
          <label
            htmlFor="check-in-deadline"
            className="mb-1.5 block text-sm text-zinc-400"
          >
            Check-in deadline
          </label>
          <input
            id="check-in-deadline"
            type="text"
            value={settings.checkInDeadline}
            onChange={(event) =>
              onChange({ ...settings, checkInDeadline: event.target.value })
            }
            placeholder="09:00 AM"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-primary/50"
          />
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </section>
  );
}
