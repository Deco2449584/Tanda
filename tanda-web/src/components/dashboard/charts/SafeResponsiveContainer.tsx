'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Recharts defaults initialDimension to {-1,-1}, which logs a console warning
 * before the first layout measurement. We measure the parent ourselves and only
 * mount with positive pixel sizes.
 */
export function SafeResponsiveContainer({
  children,
  className = 'h-full w-full min-h-0 min-w-0',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;
      setSize((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {size ? (
        <ResponsiveContainer
          width={size.width}
          height={size.height}
          minWidth={0}
          initialDimension={size}
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
