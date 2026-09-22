import { KNOWN_ULD_PREFIXES } from '@/utils/cargoUnitType';
import { normalizeUldId } from '@/utils/uldId';

export type ParsedCargoLabel = {
  uldCandidates: string[];
  awbCandidates: string[];
  rawLines: string[];
};

/**
 * ULD parts with flexible separators.
 * Serial allows common OCR letter lookalikes (O/I/l/S/B) that we normalize to digits.
 */
const ULD_PATTERN =
  /\b([A-Z]{3})[\s-]*([0-9OIlSB|]{4,5})[\s-]*([A-Z]{2,3})\b/gi;
const ULD_COMPACT_PATTERN = /\b([A-Z]{3})([0-9OIlSB|]{4,5})([A-Z]{2,3})\b/gi;
const AWB_PATTERN = /\b(\d{3})[\s-]*(\d{8})\b/g;

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

/** Collapse whitespace and strip punctuation that OCR often inserts around codes. */
function preprocessOcrText(text: string): string {
  return text
    .toUpperCase()
    // Keep "|" — OCR sometimes reads "1" as "|"; serial correction maps it to 1.
    .replace(/[\\/_.=:;,'"`~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fix common OCR letter↔digit swaps inside the numeric serial only. */
function correctSerialOcrArtifacts(serial: string): string {
  return serial
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8');
}

function formatAwb(match: RegExpExecArray): string {
  return `${match[1]}-${match[2]}`;
}

function pushUldCandidate(
  candidates: string[],
  typeCode: string,
  serialRaw: string,
  owner: string,
): void {
  const serial = correctSerialOcrArtifacts(serialRaw);
  if (!/^\d{4,5}$/.test(serial)) {
    return;
  }
  if (!/^[A-Z]{2,3}$/.test(owner.toUpperCase())) {
    return;
  }
  candidates.push(normalizeUldId(`${typeCode} ${serial} ${owner}`));
}

function extractMatches(
  text: string,
  pattern: RegExp,
  push: (match: RegExpExecArray) => void,
): void {
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    push(match);
    match = pattern.exec(text);
  }
}

function rankKnownFirst(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const aKnown = KNOWN_ULD_PREFIXES.has(a.slice(0, 3)) ? 0 : 1;
    const bKnown = KNOWN_ULD_PREFIXES.has(b.slice(0, 3)) ? 0 : 1;
    return aKnown - bKnown;
  });
}

function extractUldCandidates(text: string): string[] {
  const candidates: string[] = [];

  const collect = (match: RegExpExecArray) => {
    pushUldCandidate(candidates, match[1], match[2], match[3]);
  };

  extractMatches(text, ULD_PATTERN, collect);
  extractMatches(text, ULD_COMPACT_PATTERN, collect);

  return rankKnownFirst(uniqueStrings(candidates));
}

function extractAwbCandidates(text: string): string[] {
  const candidates: string[] = [];
  extractMatches(text, AWB_PATTERN, (match) => {
    candidates.push(formatAwb(match));
  });
  return uniqueStrings(candidates);
}

/**
 * Reconstruct ULD when OCR splits type / serial / owner across lines
 * (e.g. "AKE", "12345", "CX" as three lines).
 */
function extractSplitLineUlds(lines: readonly string[]): string[] {
  const tokens = lines
    .flatMap((line) => preprocessOcrText(line).split(' '))
    .map((token) => token.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (let i = 0; i < tokens.length - 2; i += 1) {
    const typeCode = tokens[i];
    const serialRaw = tokens[i + 1];
    const owner = tokens[i + 2];
    if (!/^[A-Z]{3}$/.test(typeCode)) continue;
    if (!/^[A-Z0-9ILSB|]{4,5}$/.test(serialRaw)) continue;
    if (!/^[A-Z]{2,3}$/.test(owner)) continue;
    pushUldCandidate(candidates, typeCode, serialRaw, owner);
  }

  return uniqueStrings(candidates);
}

export function parseCargoLabelOcr(lines: readonly string[]): ParsedCargoLabel {
  const rawLines = lines.map((line) => line.trim()).filter(Boolean);
  const combined = preprocessOcrText(rawLines.join(' '));
  const splitLineUlds = extractSplitLineUlds(rawLines);

  return {
    uldCandidates: rankKnownFirst(
      uniqueStrings([...extractUldCandidates(combined), ...splitLineUlds]),
    ),
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
