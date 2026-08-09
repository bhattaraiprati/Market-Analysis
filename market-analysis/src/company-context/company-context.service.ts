/**
 * Company Context Service
 * Loads and formats organization data from PostgreSQL
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Organization } from '../models/organization.model';

@Injectable()
export class CompanyContextService {
  constructor(
    @InjectModel(Organization)
    private readonly organizationRepo: typeof Organization,
  ) {}

  /**
   * Load complete company context as formatted string
   * This is what agents will receive as context
   */
  async loadContext(organizationId: string): Promise<string> {
    const org = await this.organizationRepo.findByPk(organizationId);

    if (!org) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    return this.formatContext(org);
  }

  /**
   * Get raw organization data
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    const org = await this.organizationRepo.findByPk(organizationId);

    if (!org) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    return org;
  }

  /**
   * Format organization data into structured context string
   * This format is optimized for LLM consumption
   */
  private formatContext(org: Organization): string {
    const sections: string[] = [];

    // Company Profile
    sections.push('# COMPANY PROFILE');
    sections.push(`Company Name: ${org.name}`);
    if (org.description) sections.push(`Description: ${org.description}`);
    sections.push(`Industry: ${org.industry}`);
    if (org.website) sections.push(`Website: ${org.website}`);
    if (org.location) sections.push(`Location: ${org.location}`);
    if (org.company_size) sections.push(`Company Size: ${org.company_size}`);
    sections.push('');

    // Product/Service
    sections.push('# PRODUCT/SERVICE');
    sections.push(org.product_or_service);
    sections.push('');

    // Target Customers
    sections.push('# TARGET CUSTOMERS');
    sections.push(org.target_customers);
    sections.push('');

    // Business Goals
    sections.push('# BUSINESS GOALS');
    sections.push(org.business_goals);
    sections.push('');

    // Challenges
    if (org.current_challenges) {
      sections.push('# CURRENT CHALLENGES');
      sections.push(org.current_challenges);
      sections.push('');
    }

    // Known Competitors
    if (org.known_competitors && org.known_competitors.length > 0) {
      sections.push('# KNOWN COMPETITORS');
      sections.push(org.known_competitors.join(', '));
      sections.push('');
    }

    return sections.join('\n').trim();
  }

  /**
   * Extract key information for specific use cases
   */
  async getKeyInfo(organizationId: string): Promise<{
    name: string;
    industry: string;
    location: string;
    knownCompetitors: string[];
  }> {
    const org = await this.getOrganization(organizationId);

    return {
      name: org.name,
      industry: org.industry,
      location: org.location || 'Not specified',
      knownCompetitors: org.known_competitors || [],
    };
  }
}
