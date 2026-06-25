import { LoginLayoutClient } from '@/app/login/LoginLayoutClient';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LoginLayoutClient>{children}</LoginLayoutClient>;
}
