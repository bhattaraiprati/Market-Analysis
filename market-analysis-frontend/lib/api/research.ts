import { axiosInstance } from './client';
import {
  ResearchJob,
  StartResearchDto,
  ApiResponse,
} from '@/types/api';

export const researchApi = {
  // Start new research job
  start: async (data: StartResearchDto) => {
    const response = await axiosInstance.post<ResearchJob>(
      '/research/start',
      data
    );
    return response.data;
  },

  // Get all research jobs
  getAll: async () => {
    const response = await axiosInstance.get<{ jobs: ResearchJob[] }>(
      '/research/jobs'
    );
    return response.data;
  },

  // Get research job status
  getById: async (jobId: string) => {
    const response = await axiosInstance.get<ResearchJob>(
      `/research/jobs/${jobId}`
    );
    return response.data;
  },

  // Get research job sources
  getSources: async (jobId: string) => {
    const response = await axiosInstance.get<{
      sources: Array<{
        id: string;
        url: string;
        title: string;
        content: string;
        scraped_at: string;
        competitor_name?: string;
      }>;
    }>(`/research/jobs/${jobId}/sources`);
    return response.data;
  },

  // Download research report
  downloadReport: async (jobId: string) => {
    const response = await axiosInstance.get<string>(
      `/research/jobs/${jobId}/report`,
      {
        responseType: 'text',
        headers: {
          'Accept': 'text/markdown',
        },
      }
    );
    return response.data;
  },
};
