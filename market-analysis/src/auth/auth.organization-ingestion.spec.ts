import { AuthService } from './auth.service';
import { OrganizationStatus } from '../common/enums';

describe('AuthService organization website integration', () => {
  it('queues the website supplied by the registration form before returning', async () => {
    const userModel = {
      findByPk: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };
    const organization = {
      id: 'org-1',
      name: 'Example Company',
      website: 'https://example.com',
      status: OrganizationStatus.PENDING_APPROVAL,
    };
    const organizationModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(organization),
    };
    const organizationMemberModel = {
      create: jest.fn().mockResolvedValue({}),
    };
    const ingestionService = {
      start: jest.fn().mockResolvedValue({
        status: 'queued',
        knowledgeBaseId: 'kb-1',
      }),
    };
    const service = new AuthService(
      userModel as any,
      organizationModel as any,
      organizationMemberModel as any,
      {} as any,
      { get: jest.fn() } as any,
      ingestionService as any,
    );

    const result = await service.createOrganization('user-1', {
      name: 'Example Company',
      industry: 'Software',
      website: ' https://example.com ',
      product_or_service: 'Business workflow software',
      target_customers: 'Growing business operations teams',
      business_goals: 'Help customers improve operational performance',
    });

    expect(organizationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ website: 'https://example.com' }),
    );
    expect(ingestionService.start).toHaveBeenCalledWith(organization, 'user-1');
    expect(result.websiteIngestion).toEqual({
      status: 'queued',
      knowledgeBaseId: 'kb-1',
    });
  });
});
