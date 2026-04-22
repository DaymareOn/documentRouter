import type {
  ApiResponse,
  Document,
  PaginatedResponse,
  PaginationQuery,
} from '@vibe-router/shared-types';
import { apiClient } from './client';

export const documentsApi = {
  getDocuments: (params?: PaginationQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Document>>>('/api/documents', { params }),

  getDocument: (id: string) =>
    apiClient.get<ApiResponse<Document>>(`/api/documents/${id}`),
};
