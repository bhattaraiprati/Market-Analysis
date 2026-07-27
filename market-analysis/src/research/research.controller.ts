/**
 * Research Controller
 * Handles research job creation and status endpoints
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResearchService } from './research.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Organization } from '../models/organization.model';
import { StartResearchDto } from './dto/start-research.dto';

@ApiTags('research')
@ApiBearerAuth()
@Controller('research')
@UseGuards(JwtAuthGuard)
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start competitor research',
    description:
      'Initiates automated competitor research using AI agents. This process includes web scraping, data analysis, and report generation.',
  })
  async startResearch(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: StartResearchDto,
  ) {
    // For now, we only support COMPETITOR research
    // Get organization ID from user's membership
    const organizationId = await this.getUserOrganizationId(user.userId);

    return this.researchService.startCompetitorResearch(
      organizationId,
      user.userId,
    );
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Get all research jobs',
    description: 'Returns all research jobs for the user organization',
  })
  async getJobs(@CurrentUser() user: CurrentUserData) {
    const organizationId = await this.getUserOrganizationId(user.userId);
    return this.researchService.getOrganizationJobs(organizationId);
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get research job status',
    description: 'Returns the status and details of a specific research job',
  })
  async getJobStatus(@CurrentUser() user: CurrentUserData, @Param('jobId') jobId: string) {
    const organizationId = await this.getUserOrganizationId(user.userId);
    return this.researchService.getJobStatus(jobId, organizationId);
  }

  @Get('jobs/:jobId/sources')
  @ApiOperation({
    summary: 'Get research job sources',
    description: 'Returns all scraped sources for a research job',
  })
  async getJobSources(
    @CurrentUser() user: CurrentUserData,
    @Param('jobId') jobId: string,
  ) {
    const organizationId = await this.getUserOrganizationId(user.userId);
    return this.researchService.getJobSources(jobId, organizationId);
  }

  /**
   * Helper to get user's organization ID
   * MVP: User owns one organization directly (uses owner_id field)
   */
  private async getUserOrganizationId(userId: string): Promise<string> {
    // Directly query organization by owner_id (MVP approach)
    const organization = await Organization.findOne({
      where: { owner_id: userId },
    });

    if (!organization) {
      throw new Error('User does not have an organization. Please create one first.');
    }

    return organization.id;
  }
}
