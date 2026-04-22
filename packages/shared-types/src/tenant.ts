export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'team' | 'enterprise';
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  maxDocuments: number;
  maxStorageBytes: number;
  allowedMimeTypes: string[];
  ocrProvider: 'tesseract' | 'google_vision' | 'aws_textract' | 'auto';
  encryptionEnabled: boolean;
  retentionDays: number;
}
