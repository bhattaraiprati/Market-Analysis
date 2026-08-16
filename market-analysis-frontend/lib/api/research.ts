import { axiosInstance } from './client';
import {
  ResearchJob,
  ResearchSource,
  StartResearchDto,
} from '@/types/api';

export const researchApi = {
  // Start new research job
  start: async (data: StartResearchDto): Promise<ResearchJob> => {
    const response = await axiosInstance.post<ResearchJob>(
      '/research/start',
      data
    );
    return response.data;
  },

  // Get all research jobs
  getAll: async (): Promise<{ jobs: ResearchJob[] }> => {
    const response = await axiosInstance.get<{ jobs: ResearchJob[] }>(
      '/research/jobs'
    );
    return response.data;
  },

  // Get research job status
  getById: async (jobId: string): Promise<ResearchJob> => {
    const response = await axiosInstance.get<ResearchJob>(
      `/research/jobs/${jobId}`
    );
    return response.data;
  },

  // Get research job sources
  getSources: async (jobId: string): Promise<{ sources: ResearchSource[] }> => {
    const response = await axiosInstance.get<{ sources: ResearchSource[] }>(
      `/research/jobs/${jobId}/sources`
    );
    return response.data;
  },

  // Download research report
  downloadReport: async (jobId: string): Promise<string> => {
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
