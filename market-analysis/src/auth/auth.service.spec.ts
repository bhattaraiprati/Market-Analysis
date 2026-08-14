import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { OrganizationStatus } from '../common/enums';
import type { CompanyWebsiteIngestionService } from '../company-ingestion/company-website-ingestion.service';
import type { Organization } from '../models/organization.model';
import type { OrganizationMember } from '../models/organizationMember.model';
import type { User } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let organizationModel: { findByPk: jest.Mock };

  beforeEach(() => {
    organizationModel = {
      findByPk: jest.fn(),
    };

    service = new AuthService(
      {} as unknown as typeof User,
      organizationModel as unknown as typeof Organization,
      {} as unknown as typeof OrganizationMember,
      {} as JwtService,
      {} as ConfigService,
      {} as CompanyWebsiteIngestionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrganizationDetails', () => {
    it('returns every registration field without internal fields', async () => {
      organizationModel.findByPk.mockResolvedValue({
        id: 'org-1',
        owner_id: 'user-1',
        name: 'Example Company',
        description: 'An example organization',
        industry: 'Software',
        website: 'https://example.com',
        product_or_service: 'Business workflow software',
        target_customers: 'Growing business operations teams',
        business_goals: 'Improve customer operational performance',
        current_challenges: 'Expanding into new markets',
        known_competitors: ['Competitor One', 'Competitor Two'],
        company_size: '11-50',
        location: 'Kathmandu, Nepal',
        status: OrganizationStatus.ACTIVE,
        rejection_reason: 'private value',
      });

      const result = await service.getOrganizationDetails('org-1');

      expect(result).toEqual({
        id: 'org-1',
        name: 'Example Company',
        description: 'An example organization',
        industry: 'Software',
        website: 'https://example.com',
        product_or_service: 'Business workflow software',
        target_customers: 'Growing business operations teams',
        business_goals: 'Improve customer operational performance',
        current_challenges: 'Expanding into new markets',
        known_competitors: ['Competitor One', 'Competitor Two'],
        company_size: '11-50',
        location: 'Kathmandu, Nepal',
        status: OrganizationStatus.ACTIVE,
      });
      expect(result).not.toHaveProperty('owner_id');
      expect(result).not.toHaveProperty('rejection_reason');
      expect(organizationModel.findByPk).toHaveBeenCalledWith('org-1', {
        attributes: [
          'id',
          'name',
          'description',
          'industry',
          'website',
          'product_or_service',
          'target_customers',
          'business_goals',
          'current_challenges',
          'known_competitors',
          'company_size',
          'location',
          'status',
        ],
      });
    });

    it('normalizes omitted optional registration fields to null', async () => {
      organizationModel.findByPk.mockResolvedValue({
        id: 'org-1',
        name: 'Example Company',
        industry: 'Software',
        product_or_service: 'Business workflow software',
        target_customers: 'Growing business operations teams',
        business_goals: 'Improve customer operational performance',
        status: OrganizationStatus.ACTIVE,
      });

      const result = await service.getOrganizationDetails('org-1');

      expect(result).toEqual(
        expect.objectContaining({
          description: null,
          website: null,
          current_challenges: null,
          known_competitors: null,
          company_size: null,
          location: null,
        }),
      );
    });

    it('throws when the authenticated user has no organization', async () => {
      await expect(service.getOrganizationDetails(null)).rejects.toThrow(
        new NotFoundException('Organization not found'),
      );
      expect(organizationModel.findByPk).not.toHaveBeenCalled();
    });

    it('throws when the resolved organization no longer exists', async () => {
      organizationModel.findByPk.mockResolvedValue(null);

      await expect(service.getOrganizationDetails('org-1')).rejects.toThrow(
        new NotFoundException('Organization not found'),
      );
    });
  });
});
