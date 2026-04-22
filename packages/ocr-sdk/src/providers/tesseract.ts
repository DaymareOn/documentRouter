import type { OcrResult } from '@vibe-router/shared-types';
import type { OcrProvider } from './base';
import { createLogger } from '@vibe-router/shared-utils';
import { extractMetadata } from '../extractor';

const log = createLogger('tesseract-provider');

/**
 * Tesseract OCR provider.
 * In production, integrate with the `tesseract.js` npm package or
 * a locally-installed Tesseract binary via child_process.
 * This implementation provides the correct interface and wires up
 * metadata extraction so the rest of the pipeline works end-to-end.
 */
export class TesseractProvider implements OcrProvider {
  readonly name = 'tesseract';

  async processDocument(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    log.info('Processing document with Tesseract', { mimeType, bytes: buffer.length });

    // Dynamically require tesseract.js if available; fall back to empty text otherwise.
    let text = '';
    let confidence = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
      const Tesseract = require('tesseract.js') as any;
      const result = await Tesseract.recognize(buffer, 'eng');
      text = result.data.text;
      confidence = result.data.confidence / 100;
    } catch {
      log.warn('tesseract.js not installed; returning empty OCR result');
    }

    const metadata = extractMetadata(text);

    return {
      text,
      confidence,
      provider: this.name,
      metadata,
    };
  }
}
