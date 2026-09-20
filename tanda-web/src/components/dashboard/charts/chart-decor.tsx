'use client';

import type { ReactElement } from 'react';
import { Sector } from 'recharts';
import { DASHBOARD_CHART_COLORS } from '@/lib/dashboard/chart-colors';

export const CHART_GLOW_FILTER_ID = 'tandaChartGlow';

/** Extrusion offset in px. Kept small so bar tops stay aligned with the axis. */
const DEPTH = 7;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function mix(hex: string, target: number, amount: number): string {
  if (!hex.startsWith('#')) return hex;
  const [r, g, b] = hexToRgb(hex);
  const blend = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + (target - channel) * amount)));
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, 255, amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, 0, amount);
}

export function barGradientId(color: string): string {
  return `tandaBar${color.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function barGradientFill(color: string): string {
  return `url(#${barGradientId(color)})`;
}

export function areaGradientId(color: string): string {
  return `tandaArea${color.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function areaGradientFill(color: string): string {
  return `url(#${areaGradientId(color)})`;
}

/**
 * Renders the shared gradient/filter definitions. Called as a function (not a
 * component) so the chart receives a real `defs` child, which Recharts renders
 * verbatim inside the chart SVG.
 */
export function chartDefs(
  palette: readonly string[] = DASHBOARD_CHART_COLORS,
): ReactElement {
  const unique = [...new Set(palette)];

  return (
    <defs>
      {unique.map((color) => (
        <linearGradient
          key={`bar-${color}`}
          id={barGradientId(color)}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={lighten(color, 0.16)} stopOpacity={1} />
          <stop offset="55%" stopColor={color} stopOpacity={0.96} />
          <stop offset="100%" stopColor={darken(color, 0.3)} stopOpacity={0.92} />
        </linearGradient>
      ))}
      {unique.map((color) => (
        <linearGradient
          key={`area-${color}`}
          id={areaGradientId(color)}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="60%" stopColor={color} stopOpacity={0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      ))}
      <filter
        id={CHART_GLOW_FILTER_ID}
        x="-40%"
        y="-40%"
        width="180%"
        height="180%"
      >
        <feGaussianBlur stdDeviation="3.5" result="glowBlur" />
        <feMerge>
          <feMergeNode in="glowBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

interface DepthBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  /** Base color used to derive the lit top face and shaded side. */
  baseColor?: string;
  /** Datum injected by Recharts; `__color` carries the per-bar palette color. */
  payload?: { __color?: string };
  /** Brighten the hovered bar. */
  active?: boolean;
  /** Dim bars that are not the active hover target. */
  faded?: boolean;
  radius?: number;
}

/**
 * Bar shape with a lit top face and a shaded right side, so columns read as
 * extruded blocks while the front face still maps exactly to the axis scale.
 */
export function DepthBar(props: DepthBarProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill,
    baseColor,
    payload,
    active = false,
    faded = false,
    radius = 3,
  } = props;

  if (width <= 0 || height <= 0) return null;

  const color =
    baseColor ??
    payload?.__color ??
    (fill?.startsWith('#') ? fill : undefined);
  const frontFill = color ? barGradientFill(color) : (fill ?? 'currentColor');
  const topFill = color ? lighten(color, 0.42) : 'rgba(255,255,255,0.35)';
  const sideFill = color ? darken(color, 0.42) : 'rgba(0,0,0,0.35)';
  const depth = Math.max(3, Math.min(DEPTH, width * 0.28));
  const opacity = faded ? 0.28 : 1;

  return (
    <g opacity={opacity}>
      <polygon
        points={`${x},${y} ${x + depth},${y - depth} ${x + width + depth},${y - depth} ${x + width},${y}`}
        fill={topFill}
      />
      <polygon
        points={`${x + width},${y} ${x + width + depth},${y - depth} ${x + width + depth},${y + height - depth} ${x + width},${y + height}`}
        fill={sideFill}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        fill={frontFill}
      />
      {active ? (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={radius}
          ry={radius}
          fill="rgba(255,255,255,0.14)"
        />
      ) : null}
    </g>
  );
}

interface DepthPieSectorProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}

/** Active (hovered) donut slice: lifts out and gains an outer accent ring. */
export function DepthPieSector(props: DepthPieSectorProps) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = '#38bdf8',
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 11}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={lighten(fill, 0.3)}
        opacity={0.85}
      />
    </g>
  );
}
