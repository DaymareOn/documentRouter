import type { OcrProvider } from './providers/base';
import { TesseractProvider } from './providers/tesseract';

export type OcrProviderName = 'tesseract' | 'google_vision' | 'aws_textract' | 'auto';

export function createOcrProvider(providerName: OcrProviderName = 'auto'): OcrProvider {
  const resolved = providerName === 'auto' ? detectAvailableProvider() : providerName;

  switch (resolved) {
    case 'tesseract':
      return new TesseractProvider();
    case 'google_vision':
      throw new Error('Google Vision provider not yet configured. Set GOOGLE_VISION_CREDENTIALS.');
    case 'aws_textract':
      throw new Error('AWS Textract provider not yet configured. Set AWS_REGION and credentials.');
    default:
      return new TesseractProvider();
  }
}

function detectAvailableProvider(): OcrProviderName {
  if (process.env.GOOGLE_VISION_CREDENTIALS) return 'google_vision';
  if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) return 'aws_textract';
  return 'tesseract';
}
