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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm md:p-6">
      <h2 className="text-sm font-semibold text-white">Perfil del administrador</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Datos de la cuenta con la que iniciaste sesión.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="admin-name"
            className="mb-1.5 block text-sm text-zinc-400"
          >
            Nombre
          </label>
          <input
            id="admin-name"
            type="text"
            value={name}
            disabled={loading}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500/50 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="admin-email"
            className="mb-1.5 block text-sm text-zinc-400"
          >
            Correo
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-500"
          />
        </div>

        <button
          type="button"
          onClick={onChangePassword}
          disabled={loading}
          className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cambiar contraseña
        </button>
      </div>
    </section>
  );
}
