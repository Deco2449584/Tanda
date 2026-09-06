import { normalizeUldId } from '@/utils/uldId';

export type ParsedCargoLabel = {
  uldCandidates: string[];
  awbCandidates: string[];
  rawLines: string[];
};

const ULD_PATTERN = /\b([A-Z]{3})[\s-]?(\d{4,5})[\s-]?([A-Z]{2,3})\b/gi;
const AWB_PATTERN = /\b(\d{3})[\s-]?(\d{8})\b/g;

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.trim().toUpperCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }

  return result;
}

function formatAwb(match: RegExpExecArray): string {
  return `${match[1]}-${match[2]}`;
}

function extractUldCandidates(text: string): string[] {
  const candidates: string[] = [];
  ULD_PATTERN.lastIndex = 0;

  let match = ULD_PATTERN.exec(text);
  while (match) {
    candidates.push(normalizeUldId(`${match[1]} ${match[2]} ${match[3]}`));
    match = ULD_PATTERN.exec(text);
  }

  return uniqueStrings(candidates);
}

function extractAwbCandidates(text: string): string[] {
  const candidates: string[] = [];
  AWB_PATTERN.lastIndex = 0;

  let match = AWB_PATTERN.exec(text);
  while (match) {
    candidates.push(formatAwb(match));
    match = AWB_PATTERN.exec(text);
  }

  return uniqueStrings(candidates);
}

export function parseCargoLabelOcr(lines: readonly string[]): ParsedCargoLabel {
  const rawLines = lines.map((line) => line.trim()).filter(Boolean);
  const combined = rawLines.join('\n').toUpperCase();

  return {
    uldCandidates: extractUldCandidates(combined),
    awbCandidates: extractAwbCandidates(combined),
    rawLines,
  };
}

export function pickDefaultCargoLabelFields(parsed: ParsedCargoLabel): {
  uldId: string;
  awbNumber: string;
} {
  return {
    uldId: parsed.uldCandidates[0] ?? '',
    awbNumber: parsed.awbCandidates[0] ?? '',
  };
}
