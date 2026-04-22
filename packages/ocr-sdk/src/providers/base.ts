import type { OcrResult } from '@vibe-router/shared-types';

export interface OcrProvider {
  name: string;
  processDocument(buffer: Buffer, mimeType: string): Promise<OcrResult>;
}
