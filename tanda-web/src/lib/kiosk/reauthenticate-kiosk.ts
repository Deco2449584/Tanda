import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function reauthenticateKioskPassword(password: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user?.email) {
    throw new Error('You must be signed in.');
  }

  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error('Password is required.');
  }

  const credential = EmailAuthProvider.credential(user.email, trimmed);
  await reauthenticateWithCredential(user, credential);
}
