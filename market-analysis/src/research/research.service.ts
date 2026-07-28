/**
 * Research Service
 * Handles research job creation and agent orchestration
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SearcherAgent } from '../agents/searcher/searcher.agent';
import { AnalystAgent } from '../agents/analyst/analyst.agent';
import { CompanyContextService } from '../company-context/company-context.service';
import { ResearchJob } from '../models/research-job.model';
import { ResearchSource } from '../models/research-source.model';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    @InjectModel(ResearchJob)
    private readonly researchJobRepo: typeof ResearchJob,
    @InjectModel(ResearchSource)
    private readonly researchSourceRepo: typeof ResearchSource,
    private readonly searcherAgent: SearcherAgent,
    private readonly analystAgent: AnalystAgent,
    private readonly companyContextService: CompanyContextService,
  ) {}
  

  /**
   * Start competitor research for an organization
   */
  async startCompetitorResearch(
    organizationId: string,
    userId: string,
  ): Promise<{ jobId: string; message: string }> {
    // 1. Verify organization exists
    await this.companyContextService.getOrganization(organizationId);

    // 2. Create research job
    const job = await this.researchJobRepo.create({
      organization_id: organizationId,
      status: 'PENDING',
      research_type: 'COMPETITOR',
      input_parameters: {
        initiatedBy: userId,
        timestamp: new Date().toISOString(),
      },
      agent_orchestration_state: {},
    });

    // 3. Execute searcher agent asynchronously
    this.executeSearcherAgent(job.id, organizationId).catch((error) => {
      console.error(`Searcher agent failed for job ${job.id}:`, error);
    });

    return {
      jobId: job.id,
      message: 'Competitor research started. This may take 5-10 minutes.',
    };
  }

  /**
   * Execute Searcher Agent
   */
  private async executeSearcherAgent(
    jobId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      // Update status to in progress
      await this.researchJobRepo.update(
        {
          status: 'IN_PROGRESS',
          agent_orchestration_state: {
            currentAgent: 'Searcher',
            currentStep: 'Searching and scraping competitor sources',
            startedAt: new Date().toISOString(),
          },
        },
        { where: { id: jobId } },
      );

      // Load company context
      const companyContext =
        await this.companyContextService.loadContext(organizationId);

      // Execute Searcher Agent
      console.log(`🔍 Starting SearcherAgent for job ${jobId}...`);
      const searcherResult = await this.searcherAgent.execute({
        organizationId,
        researchJobId: jobId,
        companyContext,
      });


      if (!searcherResult.success || !searcherResult.data) {
        throw new Error(searcherResult.error || 'Searcher agent failed');
      }

      console.log(`✅ SearcherAgent completed: ${searcherResult.data.totalScraped} sources scraped`);

      // Store scraped sources in database
      await this.storeSources(jobId, searcherResult.data.sources);

      // Update job status - Searcher completed, starting Analyst
      await this.researchJobRepo.update(
        {
          status: 'IN_PROGRESS',
          agent_orchestration_state: {
            currentAgent: 'Analyst',
            currentStep: 'Analyzing competitor data and generating insights',
            searcherCompleted: true,
            sourcesFound: searcherResult.data.totalScraped,
            competitorsIdentified: searcherResult.data.competitors.length,
            transitionedAt: new Date().toISOString(),
          },
        },
        { where: { id: jobId } },
      );

      // Execute Analyst Agent
      console.log(`🧠 Starting AnalystAgent for job ${jobId}...`);
      const analystResult = await this.analystAgent.execute({
        organizationId,
        researchJobId: jobId,
        companyContext,
        additionalParams: {
          sources: searcherResult.data.sources,
          competitors: searcherResult.data.competitors,
        },
      });

      if (!analystResult.success || !analystResult.data) {
        throw new Error(analystResult.error || 'Analyst agent failed');
      }

      console.log(`✅ AnalystAgent completed: ${analystResult.data.totalCompetitorsAnalyzed} competitors analyzed`);

      // Store analysis results
      await this.storeAnalysis(jobId, analystResult.data);

      // Update job with final results
      await this.researchJobRepo.update(
        {
          status: 'COMPLETED',
          completed_at: new Date(),
          agent_orchestration_state: {
            currentAgent: 'Completed',
            currentStep: 'All agents completed successfully',
            completedAt: new Date().toISOString(),
            searcherResults: {
              sourcesFound: searcherResult.data.totalScraped,
              competitorsIdentified: searcherResult.data.competitors.length,
              executionTimeMs: searcherResult.data.executionTimeMs,
            },
            analystResults: {
              competitorsAnalyzed: analystResult.data.totalCompetitorsAnalyzed,
              gapsIdentified: analystResult.data.gapAnalysis.length,
              recommendationsGenerated: analystResult.data.strategicRecommendations.length,
              executionTimeMs: analystResult.data.executionTimeMs,
            },
          },
        },
        { where: { id: jobId } },
      );

      console.log(`🎉 Research job ${jobId} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Research job ${jobId} failed:`, error);

      await this.researchJobRepo.update(
        {
          status: 'FAILED',
          error_message: errorMessage,
          agent_orchestration_state: {
            currentAgent: 'Failed',
            currentStep: 'Agent execution failed',
            failedAt: new Date().toISOString(),
            error: errorMessage,
          },
        },
        { where: { id: jobId } },
      );
    }
  }

  /**
   * Store scraped sources in database
   */
  private async storeSources(
    jobId: string,
    sources: any[],
  ): Promise<void> {
    if (!sources || sources.length === 0) {
      console.warn(`No sources to store for job ${jobId}`);
      return;
    }

    await this.researchSourceRepo.bulkCreate(
      sources.map((source) => ({
        research_job_id: jobId,
        source_type: source.sourceType,
        url: source.url,
        title: source.title,
        content: source.content,
        scraped_at: source.scrapedAt,
        credibility_score: 0.5, // Default score
        metadata: source.metadata,
      })),
    );

    console.log(`📦 Stored ${sources.length} sources for job ${jobId}`);
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysis(jobId: string, analysis: any): Promise<void> {
    if (!analysis) {
      console.warn(`No analysis to store for job ${jobId}`);
      return;
    }

    // Update the research job with analysis results
    await this.researchJobRepo.update(
      {
        output_results: {
          competitorAnalyses: analysis.competitorAnalyses,
          gapAnalysis: analysis.gapAnalysis,
          strategicRecommendations: analysis.strategicRecommendations,
          marketPosition: analysis.marketPosition,
          executiveSummary: analysis.executiveSummary,
          keyInsights: analysis.keyInsights,
        },
        analyzed_at: new Date(),
      },
      { where: { id: jobId } },
    );

    this.logger.log(`📊 Stored analysis results for job ${jobId}`);
    this.logger.log(`   - ${analysis.totalCompetitorsAnalyzed} competitors analyzed`);
    this.logger.log(`   - ${analysis.gapAnalysis} gaps identified`);
    this.logger.log(`   - ${analysis.strategicRecommendations} recommendations generated`);
    this.logger.log(`   - ${analysis.executiveSummary} executive summaries generated`);
    this.logger.log(`   - ${analysis.keyInsights} key insights generated`);

  }

  /**
   * Get research job status
   */
  async getJobStatus(
    jobId: string,
    organizationId: string,
  ): Promise<ResearchJob> {
    const job = await this.researchJobRepo.findOne({
      where: {
        id: jobId,
        organization_id: organizationId,
      },
    });

    if (!job) {
      throw new NotFoundException(`Research job ${jobId} not found`);
    }

    return job;
  }

  /**
   * Get all research jobs for an organization
   */
  async getOrganizationJobs(
    organizationId: string,
    limit: number = 10,
  ): Promise<ResearchJob[]> {
    return this.researchJobRepo.findAll({
      where: { organization_id: organizationId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get sources for a research job
   */
  async getJobSources(
    jobId: string,
    organizationId: string,
  ): Promise<ResearchSource[]> {
    // Verify job belongs to organization
    const job = await this.getJobStatus(jobId, organizationId);

    return this.researchSourceRepo.findAll({
      where: { research_job_id: job.id },
      order: [['scraped_at', 'DESC']],
    });
  }
}
