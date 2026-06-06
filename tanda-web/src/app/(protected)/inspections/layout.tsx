import { CargoInspectionsProvider } from '@/providers/CargoInspectionsProvider';

export default function InspectionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CargoInspectionsProvider>{children}</CargoInspectionsProvider>;
}
