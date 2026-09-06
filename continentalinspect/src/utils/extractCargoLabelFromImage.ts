import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';

import { parseCargoLabelOcr, type ParsedCargoLabel } from '@/utils/parseCargoLabelOcr';

const OCR_MAX_WIDTH = 1400;

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
      compress: 0.85,
      format: SaveFormat.JPEG,
    },
  );

  const lines = await extractTextFromImage(prepared.uri);
  return parseCargoLabelOcr(lines);
}
