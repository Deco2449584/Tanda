import { LoginLayoutClient } from '@/app/login/LoginLayoutClient';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <LoginLayoutClient>{children}</LoginLayoutClient>;
}
