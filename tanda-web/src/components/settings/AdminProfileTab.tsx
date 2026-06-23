'use client';

import { FormEvent, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AdminProfileTabProps {
  name: string;
  email: string;
  loading: boolean;
  onNameChange: (value: string) => void;
}

export function AdminProfileTab({
  name,
  email,
  loading,
  onNameChange,
}: AdminProfileTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!auth?.currentUser) {
      setError('You must be signed in.');
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name.trim() || null,
      });
      setMessage('Profile name updated.');
    } catch {
      setError('Could not update profile name.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const user = auth?.currentUser;
    if (!user || !user.email) {
      setError('You must be signed in.');
      return;
    }

    if (!currentPassword || !newPassword) {
      setError('Enter your current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else {
        setError('Could not update password. Try again.');
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <h2 className="text-sm font-semibold text-white">Administrator profile</h2>
      <p className="mt-1 text-xs text-subtle">
        Update your display name and sign-in password (Firebase Auth).
      </p>

      <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-name" className="mb-1.5 block text-sm text-muted">
            Display name
          </label>
          <input
            id="admin-name"
            type="text"
            value={name}
            disabled={loading}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-base/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm text-muted">
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
          type="submit"
          disabled={loading || profileSaving}
          className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {profileSaving ? 'Saving…' : 'Save name'}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="mt-8 space-y-4 border-t border-border pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-subtle">
          Change password
        </h3>

        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-sm text-muted">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-base/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm text-muted">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-base/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm text-muted">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-base/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <button
          type="submit"
          disabled={passwordSaving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {passwordSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>

      {message ? (
        <p className="mt-4 text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
