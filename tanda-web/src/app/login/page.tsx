'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowRight, Globe, Lock, Mail } from 'lucide-react';
import { getHomeRouteForRole, getRoleFromEmail } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intente más tarde.';
    default:
      return 'Error al iniciar sesión. Intente nuevamente.';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const role = getRoleFromEmail(credential.user.email);
      router.push(getHomeRouteForRole(role));
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1494412574642-9faad73e268f?auto=format&fit=crop&w=1920&q=80)',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden />

      <div className="relative z-10 w-full max-w-md rounded-lg bg-white px-10 py-10 shadow-2xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <Globe className="h-9 w-9 text-[#1a4b8c]" strokeWidth={1.5} />
              <ArrowRight
                className="absolute -right-0.5 bottom-0 h-4 w-4 text-[#1a4b8c]"
                strokeWidth={2.5}
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1a4b8c]">
              Continental Cargo
            </span>
          </div>

          <h1 className="text-center text-lg font-bold tracking-wide text-gray-900">
            INICIAR SESIÓN
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Ingrese sus credenciales para acceder a la plataforma web
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@continental.com"
                className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a4b8c] focus:ring-1 focus:ring-[#1a4b8c]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a4b8c] focus:ring-1 focus:ring-[#1a4b8c]"
              />
            </div>
          </div>

          {error && (
            <p className="text-center text-xs text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Ingresando...' : 'INGRESAR'}
          </button>
        </form>

        <p className="mt-5 text-center">
          <button
            type="button"
            className="text-sm text-gray-500 underline-offset-2 hover:underline"
          >
            Olvidé mi contraseña
          </button>
        </p>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-gray-400">
          Plataforma gestionada por TimeTracker PRO — © 2024 Continental Cargo
        </p>
      </div>
    </div>
  );
}
