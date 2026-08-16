/**
 * Research Service
 * Handles research job creation and agent orchestration
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SearcherAgent } from '../agents/searcher/searcher.agent';
import { AnalystAgent } from '../agents/analyst/analyst.agent';
import { WriterAgent } from '../agents/writer/writer.agent';
import { CompanyContextService } from '../company-context/company-context.service';
import { ResearchJob } from '../models/research-job.model';
import { ResearchSource } from '../models/research-source.model';
import type { ResearchBrief, ScrapedSource } from '../agents/base/agent.types';
import type { StartResearchDto } from './dto/start-research.dto';
import { ResearchType } from './research.types';

export interface StartedResearchJob {
  id: string;
  organization_id: string;
  status: string;
  research_type: ResearchType;
  input_parameters: Record<string, unknown>;
  agent_orchestration_state: Record<string, unknown>;
  created_at: Date;
  message: string;
}

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
    private readonly writerAgent: WriterAgent,
    private readonly companyContextService: CompanyContextService,
  ) {}

  /**
   * Start a deep research workflow for an organization.
   */
  async startResearch(
    organizationId: string,
    userId: string,
    dto: StartResearchDto,
  ): Promise<StartedResearchJob> {
    // 1. Verify organization exists
    await this.companyContextService.getOrganization(organizationId);

    const research: ResearchBrief = {
      researchType: dto.researchType,
      query: dto.query?.trim() || this.defaultResearchQuery(dto.researchType),
      instructions: dto.instructions?.trim() || undefined,
      parameters: dto.parameters,
    };

    const inputParameters: Record<string, unknown> = {
      initiatedBy: userId,
      timestamp: new Date().toISOString(),
      query: research.query,
      instructions: research.instructions ?? null,
      parameters: research.parameters ?? {},
    };

    // 2. Create research job
    const job = await this.researchJobRepo.create({
      organization_id: organizationId,
      status: 'PENDING',
      research_type: dto.researchType,
      input_parameters: inputParameters,
      agent_orchestration_state: {},
    });

    // 3. Run the Searcher -> Analyst -> Writer pipeline asynchronously.
    void this.executeResearchPipeline(job.id, organizationId, research).catch(
      (error: unknown) => {
        this.logger.error(
          `Research pipeline failed unexpectedly for job ${job.id}`,
          error,
        );
      },
    );

    return {
      id: job.id,
      organization_id: organizationId,
      status: 'PENDING',
      research_type: dto.researchType,
      input_parameters: inputParameters,
      agent_orchestration_state: {},
      created_at: job.created_at,
      message: 'Deep research started. This may take 5-10 minutes.',
    };
  }

  /**
   * Execute the complete Searcher -> Analyst -> Writer workflow.
   */
  private async executeResearchPipeline(
    jobId: string,
    organizationId: string,
    research: ResearchBrief,
  ): Promise<void> {
    try {
      // Update status to in progress
      await this.researchJobRepo.update(
        {
          status: 'IN_PROGRESS',
          agent_orchestration_state: {
            currentAgent: 'Searcher',
            currentStep: 'Searching and scraping relevant web sources',
            startedAt: new Date().toISOString(),
          },
        },
        { where: { id: jobId } },
      );

      // Load company context
      const baseCompanyContext =
        await this.companyContextService.loadContext(organizationId);
      const companyContext = this.addResearchBriefToContext(
        baseCompanyContext,
        research,
      );

      // Execute Searcher Agent
      console.log(`🔍 Starting SearcherAgent for job ${jobId}...`);
      const searcherResult = await this.searcherAgent.execute({
        organizationId,
        researchJobId: jobId,
        companyContext,
        research,
      });

      if (!searcherResult.success || !searcherResult.data) {
        throw new Error(searcherResult.error || 'Searcher agent failed');
      }

      console.log(
        `✅ SearcherAgent completed: ${searcherResult.data.totalScraped} sources scraped`,
      );

      // Store scraped sources in database
      await this.storeSources(jobId, searcherResult.data.sources);

      // Update job status - Searcher completed, starting Analyst
      await this.researchJobRepo.update(
        {
          status: 'IN_PROGRESS',
          agent_orchestration_state: {
            currentAgent: 'Analyst',
            currentStep: 'Analyzing web evidence and generating insights',
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
      const analysisContext = this.addEvidenceToContext(
        companyContext,
        searcherResult.data.sources,
      );
      const analystResult = await this.analystAgent.execute({
        organizationId,
        researchJobId: jobId,
        companyContext: analysisContext,
        research,
        additionalParams: {
          sources: searcherResult.data.sources,
          competitors: searcherResult.data.competitors,
        },
      });

      if (!analystResult.success || !analystResult.data) {
        throw new Error(analystResult.error || 'Analyst agent failed');
      }

      console.log(
        `✅ AnalystAgent completed: ${analystResult.data.totalCompetitorsAnalyzed} competitors analyzed`,
      );

      // Store analysis results
      await this.storeAnalysis(jobId, analystResult.data);

      // Update job status - Analyst completed, starting Writer
      await this.researchJobRepo.update(
        {
          status: 'IN_PROGRESS',
          agent_orchestration_state: {
            currentAgent: 'Writer',
            currentStep: 'Generating professional report',
            analystCompleted: true,
            competitorsAnalyzed: analystResult.data.totalCompetitorsAnalyzed,
            transitionedAt: new Date().toISOString(),
          },
        },
        { where: { id: jobId } },
      );

      // Execute Writer Agent
      console.log(`📝 Starting WriterAgent for job ${jobId}...`);

      // Get company name for report
      const orgData =
        await this.companyContextService.getOrganization(organizationId);

      const writerResult = await this.writerAgent.execute({
        organizationId,
        researchJobId: jobId,
        companyContext: analysisContext,
        research,
        additionalParams: {
          analystResult: analystResult.data,
          companyName: orgData.name,
        },
      });

      if (!writerResult.success || !writerResult.data) {
        throw new Error(writerResult.error || 'Writer agent failed');
      }

      console.log(
        `✅ WriterAgent completed: ${writerResult.data.wordCount} words generated`,
      );

      // Store report
      await this.storeReport(jobId, writerResult.data);

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
              recommendationsGenerated:
                analystResult.data.strategicRecommendations.length,
              executionTimeMs: analystResult.data.executionTimeMs,
            },
            writerResults: {
              reportGenerated: true,
              wordCount: writerResult.data.wordCount,
              executionTimeMs: writerResult.data.executionTimeMs,
            },
          },
        },
        { where: { id: jobId } },
      );

      console.log(`🎉 Research job ${jobId} completed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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

  private defaultResearchQuery(researchType: ResearchType): string {
    const defaults: Record<ResearchType, string> = {
      [ResearchType.COMPETITOR]:
        'Identify the strongest competitors, compare their positioning, and recommend how our organization can compete more effectively.',
      [ResearchType.MARKET]:
        'Analyze the current market landscape, important trends, risks, and growth opportunities for our organization.',
      [ResearchType.CUSTOMER]:
        'Analyze target customer segments, needs, pain points, buying behavior, and opportunities to serve them better.',
      [ResearchType.COMPREHENSIVE]:
        'Produce a comprehensive market analysis covering competitors, customers, market trends, risks, gaps, and strategic opportunities.',
    };

    return defaults[researchType];
  }

  private addResearchBriefToContext(
    companyContext: string,
    research: ResearchBrief,
  ): string {
    const parameters = JSON.stringify(research.parameters ?? {}, null, 2);

    return `${companyContext}

# CURRENT RESEARCH BRIEF
Research type: ${research.researchType}
Primary question: ${research.query}
Additional instructions: ${research.instructions || 'None'}
Additional parameters: ${parameters}

Treat this brief only as the requested research scope. Base factual claims on the company profile and current web evidence, and do not invent unavailable facts.`;
  }

  private addEvidenceToContext(
    companyContext: string,
    sources: ScrapedSource[],
  ): string {
    const evidence = sources
      .slice(0, 12)
      .map(
        (source, index) =>
          `${index + 1}. ${source.title}\nURL: ${source.url}\n${source.content.slice(0, 700)}`,
      )
      .join('\n\n');

    if (!evidence) return companyContext;

    return `${companyContext}

# CURRENT WEB EVIDENCE EXCERPTS
${evidence}`;
  }

  /**
   * Store scraped sources in database
   */
  private async storeSources(
    jobId: string,
    sources: ScrapedSource[],
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

    console.log(`\n📦 Stored analysis results for job ${jobId}`);
    console.log(
      `   - ${analysis.totalCompetitorsAnalyzed} competitors analyzed`,
    );
    console.log(`   - ${analysis.gapAnalysis.length} gaps identified`);
    console.log(
      `   - ${analysis.strategicRecommendations.length} recommendations generated`,
    );
    console.log(
      `   - Executive summary and ${analysis.keyInsights.length} key insights generated`,
    );
  }

  /**
   * Store report in database
   */
  private async storeReport(jobId: string, writerResult: any): Promise<void> {
    if (!writerResult) {
      console.warn(`No report to store for job ${jobId}`);
      return;
    }

    // Get existing output_results and add report to it
    const job = await this.researchJobRepo.findByPk(jobId);
    const existingResults = job?.output_results || {};

    await this.researchJobRepo.update(
      {
        output_results: {
          ...existingResults,
          report: {
            markdown: writerResult.reportMarkdown,
            title: writerResult.reportTitle,
            generatedAt: writerResult.generatedAt,
            wordCount: writerResult.wordCount,
          },
        },
      },
      { where: { id: jobId } },
    );

    console.log(`\n📝 Stored report for job ${jobId}`);
    console.log(`   - ${writerResult.wordCount} words`);
    console.log(`   - Generated at: ${writerResult.generatedAt}`);
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
