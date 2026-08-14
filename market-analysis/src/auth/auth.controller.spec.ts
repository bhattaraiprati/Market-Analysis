import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OrganizationStatus } from '../common/enums';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { getOrganizationDetails: jest.Mock };

  beforeEach(async () => {
    authService = {
      getOrganizationDetails: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the organization resolved from the authenticated user', async () => {
    const organization = {
      id: 'org-1',
      name: 'Example Company',
      description: null,
      industry: 'Software',
      website: 'https://example.com',
      product_or_service: 'Business workflow software',
      target_customers: 'Growing business operations teams',
      business_goals: 'Improve customer operational performance',
      current_challenges: null,
      known_competitors: ['Competitor One'],
      company_size: '11-50',
      location: 'Kathmandu, Nepal',
      status: OrganizationStatus.ACTIVE,
    };
    authService.getOrganizationDetails.mockResolvedValue(organization);

    await expect(controller.getOrganization('org-1')).resolves.toEqual({
      success: true,
      message: 'Organization details retrieved successfully',
      data: organization,
    });
    expect(authService.getOrganizationDetails).toHaveBeenCalledWith('org-1');
  });
});
