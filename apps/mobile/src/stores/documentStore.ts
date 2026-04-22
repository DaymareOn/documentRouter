import { create } from 'zustand';
import type { Document } from '@vibe-router/shared-types';
import { documentsApi } from '../api/documents';

interface DocumentState {
  documents: Document[];
  selectedDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  fetchDocuments: (page?: number) => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  selectedDocument: null,
  isLoading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,

  fetchDocuments: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentsApi.getDocuments({ page, pageSize: 20 });
      const { data } = response.data;
      if (data) {
        set({
          documents: data.items,
          totalPages: data.totalPages,
          currentPage: data.page,
        });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch documents' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDocument: async (id: string) => {
    set({ isLoading: true, error: null, selectedDocument: null });
    try {
      const response = await documentsApi.getDocument(id);
      const { data } = response.data;
      if (data) {
        set({ selectedDocument: data });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch document' });
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      documents: [],
      selectedDocument: null,
      isLoading: false,
      error: null,
      totalPages: 1,
      currentPage: 1,
    }),
}));
