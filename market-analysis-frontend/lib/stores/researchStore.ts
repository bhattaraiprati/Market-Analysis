import { create } from 'zustand';
import { ResearchJob, ResearchSource, StartResearchDto } from '@/types/api';
import { researchApi } from '../api/research';

interface ResearchState {
  // State
  jobs: ResearchJob[];
  currentJob: ResearchJob | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startResearch: (data: StartResearchDto) => Promise<ResearchJob>;
  fetchJobs: () => Promise<void>;
  fetchJobById: (jobId: string) => Promise<void>;
  getSources: (jobId: string) => Promise<ResearchSource[]>;
  downloadReport: (jobId: string) => Promise<string>;
  setCurrentJob: (job: ResearchJob | null) => void;
  clearError: () => void;
}

type ApiRequestError = {
  response?: { data?: { message?: string | string[] } };
};

function getResearchError(error: unknown, fallback: string) {
  const message = (error as ApiRequestError).response?.data?.message;
  if (Array.isArray(message)) return message[0] || fallback;
  if (message) return message;
  return error instanceof Error && error.message ? error.message : fallback;
}

export const useResearchStore = create<ResearchState>((set) => ({
  // Initial state
  jobs: [],
  currentJob: null,
  isLoading: false,
  error: null,

  // Start new research
  startResearch: async (data: StartResearchDto) => {
    set({ isLoading: true, error: null });
    try {
      const job = await researchApi.start(data);
      set((state) => ({
        jobs: [job, ...state.jobs],
        currentJob: job,
        isLoading: false,
      }));
      return job;
    } catch (error: unknown) {
      const errorMessage = getResearchError(error, 'Failed to start research');
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch all jobs
  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await researchApi.getAll();
      set({ jobs: response.jobs || [], isLoading: false });
    } catch (error: unknown) {
      const errorMessage = getResearchError(error, 'Failed to fetch research jobs');
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch job by ID
  fetchJobById: async (jobId: string) => {
    set({ isLoading: true, error: null });
    try {
      const job = await researchApi.getById(jobId);
      set({ currentJob: job, isLoading: false });

      // Update in jobs list if exists
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? job : j)),
      }));
    } catch (error: unknown) {
      const errorMessage = getResearchError(error, 'Failed to fetch research job');
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Get sources
  getSources: async (jobId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await researchApi.getSources(jobId);
      set({ isLoading: false });
      return response.sources;
    } catch (error: unknown) {
      const errorMessage = getResearchError(error, 'Failed to fetch sources');
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Download report
  downloadReport: async (jobId: string) => {
    set({ isLoading: true, error: null });
    try {
      const report = await researchApi.downloadReport(jobId);
      set({ isLoading: false });
      return report;
    } catch (error: unknown) {
      const errorMessage = getResearchError(error, 'Failed to download report');
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Set current job
  setCurrentJob: (job: ResearchJob | null) => {
    set({ currentJob: job });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
