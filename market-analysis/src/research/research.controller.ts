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
  Header,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResearchService } from './research.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
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
    summary: 'Start a deep research job',
    description:
      'Starts an asynchronous Searcher -> Analyst -> Writer workflow. The agents search and scrape related websites, analyze the evidence, and generate a Markdown report.',
  })
  @ApiResponse({ status: 201, description: 'Research job accepted' })
  @ApiResponse({ status: 400, description: 'User has no organization' })
  async startResearch(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: StartResearchDto,
  ) {
    const organizationId = this.requireOrganizationId(user);

    return this.researchService.startResearch(organizationId, user.userId, dto);
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Get all research jobs',
    description: 'Returns all research jobs for the user organization',
  })
  async getJobs(@CurrentUser() user: CurrentUserData) {
    const organizationId = this.requireOrganizationId(user);
    const jobs = await this.researchService.getOrganizationJobs(organizationId);
    return { jobs };
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get research job status',
    description: 'Returns the status and details of a specific research job',
  })
  async getJobStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('jobId') jobId: string,
  ) {
    const organizationId = this.requireOrganizationId(user);
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
    const organizationId = this.requireOrganizationId(user);
    const sources = await this.researchService.getJobSources(
      jobId,
      organizationId,
    );
    return { sources };
  }

  @Get('jobs/:jobId/report')
  @Header('Content-Type', 'text/markdown')
  @ApiOperation({
    summary: 'Download research report',
    description: 'Downloads the Markdown report for a completed research job',
  })
  async downloadReport(
    @CurrentUser() user: CurrentUserData,
    @Param('jobId') jobId: string,
  ) {
    const organizationId = this.requireOrganizationId(user);
    const job = await this.researchService.getJobStatus(jobId, organizationId);

    if (!job.output_results?.report?.markdown) {
      throw new NotFoundException(
        'Report not available for this job. Ensure the job is completed.',
      );
    }

    return job.output_results.report.markdown;
  }

  private requireOrganizationId(user: CurrentUserData): string {
    if (!user.organizationId) {
      throw new BadRequestException(
        'User does not have an organization. Please create one first.',
      );
    }

    return user.organizationId;
  }
}
