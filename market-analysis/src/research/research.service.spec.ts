import { NotFoundException } from '@nestjs/common';
import type { AnalystAgent } from '../agents/analyst/analyst.agent';
import type { SearcherAgent } from '../agents/searcher/searcher.agent';
import type { WriterAgent } from '../agents/writer/writer.agent';
import type { CompanyContextService } from '../company-context/company-context.service';
import type { ResearchJob } from '../models/research-job.model';
import type { ResearchSource } from '../models/research-source.model';
import { ResearchService } from './research.service';
import { ResearchType } from './research.types';

describe('ResearchService', () => {
  let service: ResearchService;
  let researchJobRepo: {
    create: jest.Mock;
    update: jest.Mock;
  };
  let companyContextService: {
    getOrganization: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-14T00:00:00.000Z'));
    researchJobRepo = {
      create: jest.fn().mockResolvedValue({
        id: 'job-1',
        created_at: new Date('2026-08-14T00:00:00.000Z'),
      }),
      // Keep the detached pipeline paused after the start response is created.
      update: jest.fn().mockReturnValue(new Promise(() => undefined)),
    };
    companyContextService = {
      getOrganization: jest.fn().mockResolvedValue({ id: 'org-1' }),
    };

    service = new ResearchService(
      researchJobRepo as unknown as typeof ResearchJob,
      {} as unknown as typeof ResearchSource,
      {} as SearcherAgent,
      {} as AnalystAgent,
      {} as WriterAgent,
      companyContextService as unknown as CompanyContextService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores and returns the selected research type and user research brief', async () => {
    const result = await service.startResearch('org-1', 'user-1', {
      researchType: ResearchType.MARKET,
      query: '  Analyze demand for AI accounting software in Nepal  ',
      instructions: '  Prioritize evidence from the last 12 months.  ',
      parameters: {
        focusAreas: ['market size', 'pricing'],
        geography: 'Nepal',
      },
    });

    expect(researchJobRepo.create).toHaveBeenCalledWith({
      organization_id: 'org-1',
      status: 'PENDING',
      research_type: ResearchType.MARKET,
      input_parameters: {
        initiatedBy: 'user-1',
        timestamp: '2026-08-14T00:00:00.000Z',
        query: 'Analyze demand for AI accounting software in Nepal',
        instructions: 'Prioritize evidence from the last 12 months.',
        parameters: {
          focusAreas: ['market size', 'pricing'],
          geography: 'Nepal',
        },
      },
      agent_orchestration_state: {},
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-1',
        organization_id: 'org-1',
        status: 'PENDING',
        research_type: ResearchType.MARKET,
        message: 'Deep research started. This may take 5-10 minutes.',
      }),
    );
  });

  it('creates a useful default question when only researchType is supplied', async () => {
    const result = await service.startResearch('org-1', 'user-1', {
      researchType: ResearchType.COMPREHENSIVE,
    });

    expect(result.input_parameters.query).toContain(
      'comprehensive market analysis',
    );
    expect(result.input_parameters.instructions).toBeNull();
    expect(result.input_parameters.parameters).toEqual({});
  });

  it('does not create a job when the organization does not exist', async () => {
    companyContextService.getOrganization.mockRejectedValue(
      new NotFoundException('Organization not found'),
    );

    await expect(
      service.startResearch('missing-org', 'user-1', {
        researchType: ResearchType.COMPETITOR,
      }),
    ).rejects.toThrow('Organization not found');
    expect(researchJobRepo.create).not.toHaveBeenCalled();
  });
});
