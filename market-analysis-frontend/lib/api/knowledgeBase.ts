import { axiosInstance } from './client';
import {
  KnowledgeBase,
  CreateKnowledgeBaseDto,
  KBFile,
  ApiResponse,
} from '@/types/api';

export const knowledgeBaseApi = {
  // Create new knowledge base
  create: async (data: CreateKnowledgeBaseDto) => {
    const response = await axiosInstance.post<ApiResponse<KnowledgeBase>>(
      '/knowledge-bases',
      data
    );
    return response.data;
  },

  // Get all knowledge bases
  getAll: async () => {
    const response = await axiosInstance.get<ApiResponse<KnowledgeBase[]>>(
      '/knowledge-bases'
    );
    return response.data;
  },

  // Get knowledge base by ID
  getById: async (id: string) => {
    const response = await axiosInstance.get<
      ApiResponse<KnowledgeBase & { files: KBFile[] }>
    >(`/knowledge-bases/${id}`);
    return response.data;
  },

  // Update knowledge base
  update: async (id: string, data: Partial<CreateKnowledgeBaseDto>) => {
    const response = await axiosInstance.patch<ApiResponse<KnowledgeBase>>(
      `/knowledge-bases/${id}`,
      data
    );
    return response.data;
  },

  // Delete knowledge base
  delete: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/knowledge-bases/${id}`
    );
    return response.data;
  },

  // Upload one file to a knowledge base
  uploadFile: async (
    kbId: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<ApiResponse<KBFile>>(
      `/knowledge-bases/${kbId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      }
    );
    return response.data;
  },

  // Query knowledge bases
  query: async (data: {
    query: string;
    knowledge_base_ids?: string[];
    top_k?: number;
    min_score?: number;
  }) => {
    const response = await axiosInstance.post<
      ApiResponse<
        Array<{
          chunk_id: string;
          content: string;
          similarity_score: number;
          metadata: {
            file_name: string;
            knowledge_base_name: string;
            page_number?: number;
          };
        }>
      >
    >('/knowledge-bases/query', data);
    return response.data;
  },

  // Get knowledge base statistics
  getStatistics: async (id: string) => {
    const response = await axiosInstance.get<
      ApiResponse<{
        total_files: number;
        total_chunks: number;
        total_size_bytes: number;
        files_by_status: {
          COMPLETED: number;
          PROCESSING: number;
          FAILED: number;
        };
        files_by_type: {
          PDF: number;
          DOCX: number;
          TXT: number;
        };
      }>
    >(`/knowledge-bases/${id}/statistics`);
    return response.data;
  },

  // Delete file from knowledge base
  deleteFile: async (kbId: string, fileId: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/knowledge-bases/${kbId}/files/${fileId}`
    );
    return response.data;
  },
};
