import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';

import { parseCargoLabelOcr, type ParsedCargoLabel } from '@/utils/parseCargoLabelOcr';

/** Keep enough resolution for small stamped ULD codes on labels. */
const OCR_MAX_WIDTH = 2000;

export function isCargoLabelOcrSupported(): boolean {
  return isSupported;
}

export async function extractCargoLabelFromImage(imageUri: string): Promise<ParsedCargoLabel> {
  if (!isSupported) {
    throw new Error('OCR_NOT_SUPPORTED');
  }

  const prepared = await manipulateAsync(
    imageUri,
    [{ resize: { width: OCR_MAX_WIDTH } }],
    {
      compress: 0.92,
      format: SaveFormat.JPEG,
    },
  );

  const lines = await extractTextFromImage(prepared.uri);
  const parsed = parseCargoLabelOcr(Array.isArray(lines) ? lines : [String(lines ?? '')]);

  // Fallback: sometimes the extractor returns one blob; also try splitting on newlines.
  if (
    parsed.uldCandidates.length === 0 &&
    parsed.awbCandidates.length === 0 &&
    parsed.rawLines.length === 1 &&
    /[\n\r]/.test(parsed.rawLines[0])
  ) {
    return parseCargoLabelOcr(parsed.rawLines[0].split(/\r?\n/));
  }

  return parsed;
}
