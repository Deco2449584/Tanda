'use client';

import { useCallback, useMemo, useState } from 'react';

export interface ChartSeriesEntry {
  key: string;
  label: string;
  color: string;
  value: number;
}

export interface ChartSeriesState {
  entries: ChartSeriesEntry[];
  visibleEntries: ChartSeriesEntry[];
  visibleKeys: string[];
  hidden: Set<string>;
  hasHidden: boolean;
  visibleTotal: number;
  /** Rank (1-based) of a key among visible entries, sorted by value desc. */
  rankOf: (key: string) => number;
  isHidden: (key: string) => boolean;
  toggle: (key: string) => void;
  isolate: (key: string) => void;
  reset: () => void;
}

/**
 * Tracks which series/categories the user has switched off in a chart legend.
 * Totals and percentages are recomputed from the visible subset so the chart
 * stays internally consistent while filtering.
 */
export function useChartSeries(entries: ChartSeriesEntry[]): ChartSeriesState {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const visibleEntries = useMemo(
    () => entries.filter((entry) => !hidden.has(entry.key)),
    [entries, hidden],
  );

  const visibleTotal = useMemo(
    () => visibleEntries.reduce((sum, entry) => sum + entry.value, 0),
    [visibleEntries],
  );

  const rankByKey = useMemo(() => {
    const sorted = [...visibleEntries].sort((a, b) => b.value - a.value);
    return new Map(sorted.map((entry, index) => [entry.key, index + 1]));
  }, [visibleEntries]);

  const toggle = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isolate = useCallback(
    (key: string) => {
      setHidden((prev) => {
        const isAlreadyIsolated =
          prev.size === entries.length - 1 && !prev.has(key);
        if (isAlreadyIsolated) return new Set();
        return new Set(
          entries.filter((entry) => entry.key !== key).map((entry) => entry.key),
        );
      });
    },
    [entries],
  );

  const reset = useCallback(() => setHidden(new Set()), []);

  return {
    entries,
    visibleEntries,
    visibleKeys: visibleEntries.map((entry) => entry.key),
    hidden,
    hasHidden: hidden.size > 0,
    visibleTotal,
    rankOf: (key: string) => rankByKey.get(key) ?? 0,
    isHidden: (key: string) => hidden.has(key),
    toggle,
    isolate,
    reset,
  };
}
