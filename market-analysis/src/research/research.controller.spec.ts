import { BadRequestException } from '@nestjs/common';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ResearchController } from './research.controller';
import type { ResearchService } from './research.service';
import { ResearchType } from './research.types';

describe('ResearchController', () => {
  const researchService = {
    startResearch: jest.fn(),
    getOrganizationJobs: jest.fn(),
    getJobSources: jest.fn(),
  };
  const controller = new ResearchController(
    researchService as unknown as ResearchService,
  );
  const user: CurrentUserData = {
    userId: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: 'USER',
    organizationId: 'org-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the authenticated organization and complete request to the service', async () => {
    const dto = {
      researchType: ResearchType.CUSTOMER,
      query: 'What problems matter most to small retailers?',
      instructions: 'Focus on Nepal.',
    };
    researchService.startResearch.mockResolvedValue({ id: 'job-1' });

    await expect(controller.startResearch(user, dto)).resolves.toEqual({
      id: 'job-1',
    });
    expect(researchService.startResearch).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      dto,
    );
  });

  it('rejects research when the user has no organization', async () => {
    await expect(
      controller.startResearch(
        { ...user, organizationId: null },
        { researchType: ResearchType.COMPREHENSIVE },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'User does not have an organization. Please create one first.',
      ),
    );
  });

  it('wraps job and source collections for the frontend client', async () => {
    researchService.getOrganizationJobs.mockResolvedValue([{ id: 'job-1' }]);
    researchService.getJobSources.mockResolvedValue([{ id: 'source-1' }]);

    await expect(controller.getJobs(user)).resolves.toEqual({
      jobs: [{ id: 'job-1' }],
    });
    await expect(controller.getJobSources(user, 'job-1')).resolves.toEqual({
      sources: [{ id: 'source-1' }],
    });
  });
});
