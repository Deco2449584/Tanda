'use client';

interface AdminProfileCardProps {
  name: string;
  email: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onChangePassword: () => void;
}

export function AdminProfileCard({
  name,
  email,
  loading,
  onNameChange,
  onChangePassword,
}: AdminProfileCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm md:p-6">
      <h2 className="text-sm font-semibold text-white">Administrator profile</h2>
      <p className="mt-1 text-xs text-subtle">
        Account details for your signed-in session.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="admin-name"
            className="mb-1.5 block text-sm text-muted"
          >
            Name
          </label>
          <input
            id="admin-name"
            type="text"
            value={name}
            disabled={loading}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-border-strong bg-surface-base/60 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="admin-email"
            className="mb-1.5 block text-sm text-muted"
          >
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-border bg-surface-base/40 px-3 py-2.5 text-sm text-subtle"
          />
        </div>

        <button
          type="button"
          onClick={onChangePassword}
          disabled={loading}
          className="rounded-lg border border-border-strong bg-surface-hover/60 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Change password
        </button>
      </div>
    </section>
  );
}
