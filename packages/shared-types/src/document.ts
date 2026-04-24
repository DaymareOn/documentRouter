export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'archived';
export type DocumentSource = 'upload' | 'email' | 'scanner' | 'api';

export interface Document {
  id: string;
  tenantId: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  source: DocumentSource;
  s3Key: string;
  s3Bucket: string;
  ocrText?: string;
  metadata: DocumentMetadata;
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  title?: string;
  date?: string;
  amount?: number;
  currency?: string;
  sender?: string;
  recipient?: string;
  keywords: string[];
  language?: string;
  pageCount?: number;
  isEncrypted: boolean;
}

export interface DocumentUploadRequest {
  filename: string;
  mimeType: string;
  size: number;
  source: DocumentSource;
  tags?: string[];
}

export interface OcrResult {
  text: string;
  confidence: number;
  provider: string;
  metadata: Partial<DocumentMetadata>;
}
