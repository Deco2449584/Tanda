import type { Metadata } from 'next';
import { LoginLayoutClient } from '@/app/login/LoginLayoutClient';
import { workforcePwaMetadata } from '@/lib/pwa/workforce-metadata';

export const metadata: Metadata = workforcePwaMetadata;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LoginLayoutClient>{children}</LoginLayoutClient>;
}
