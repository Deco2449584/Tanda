interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Módulo en construcción.</p>
    </div>
  );
}
