/**
 * Writer Agent
 * Converts structured analyst output into professional Markdown reports
 * Uses the centralized LLM service for natural language generation
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base.agent';
import { AgentContext, AgentResult } from '../base/agent.types';
import { AnalystResult } from '../analyst/analyst.agent';
import { LlmService } from '../../llm/llm.service';

/**
 * Writer agent result
 */
export interface WriterResult {
  reportMarkdown: string;
  reportTitle: string;
  generatedAt: Date;
  wordCount: number;
  executionTimeMs: number;
}

@Injectable()
export class WriterAgent extends BaseAgent<WriterResult> {
  constructor(private readonly llmService: LlmService) {
    super('WriterAgent');
  }

  /**
   * Main execution method
   */
  async execute(context: AgentContext): Promise<AgentResult<WriterResult>> {
    this.logStart('Starting report generation');

    const startTime = Date.now();

    try {
      // 1. Get analyst result from context
      const analystResult = context.additionalParams?.analystResult as AnalystResult;
      const companyName = context.additionalParams?.companyName as string;

      if (!analystResult) {
        throw new Error('No analyst result provided. Run AnalystAgent first.');
      }

      this.logger.log(`📝 Generating report for: ${companyName || 'Unknown Company'}`);

      // 2. Generate report sections
      this.logStart('Generating report sections...');
      const reportMarkdown = await this.generateFullReport(
        companyName || 'Your Company',
        context.companyContext,
        analystResult,
      );

      // 3. Calculate metadata
      const wordCount = this.countWords(reportMarkdown);
      const executionTimeMs = Date.now() - startTime;
      const reportTitle = `Competitive Intelligence Report - ${companyName}`;

      this.logSuccess(`Report generated: ${wordCount} words in ${executionTimeMs}ms`);

      return this.createSuccessResult<WriterResult>(
        {
          reportMarkdown,
          reportTitle,
          generatedAt: new Date(),
          wordCount,
          executionTimeMs,
        },
        {
          sectionsGenerated: 7,
          competitorsIncluded: analystResult.totalCompetitorsAnalyzed,
          wordCount,
        },
      );
    } catch (error) {
      this.logError('Writer agent failed', error);
      return this.createErrorResult(error);
    }
  }

  /**
   * Generate the full report in Markdown
   */
  private async generateFullReport(
    companyName: string,
    companyContext: string,
    analystResult: AnalystResult,
  ): Promise<string> {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(companyName, analystResult));

    // 1. Executive Summary
    sections.push(await this.generateExecutiveSummarySection(analystResult));

    // 2. Key Insights
    sections.push(this.generateKeyInsightsSection(analystResult));

    // 3. Market Position
    sections.push(await this.generateMarketPositionSection(analystResult));

    // 4. Competitor Analysis
    sections.push(await this.generateCompetitorAnalysisSection(analystResult));

    // 5. Gap Analysis
    sections.push(await this.generateGapAnalysisSection(analystResult));

    // 6. Strategic Recommendations
    sections.push(await this.generateRecommendationsSection(analystResult));

    // 7. Appendix
    sections.push(this.generateAppendix(analystResult));

    return sections.join('\n\n---\n\n');
  }

  /**
   * Generate report header
   */
  private generateHeader(companyName: string, analystResult: AnalystResult): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `# Competitive Intelligence Report
## ${companyName}

**Report Date:** ${date}
**Competitors Analyzed:** ${analystResult.totalCompetitorsAnalyzed}
**Data Sources:** ${analystResult.totalSourcesAnalyzed}
**Analysis Type:** Comprehensive Market & Competitive Analysis`;
  }

  /**
   * Generate executive summary section
   */
  private async generateExecutiveSummarySection(analystResult: AnalystResult): Promise<string> {
    const systemPrompt = 'You are a professional business report writer. Write clear, concise, executive-level content.';

    const userPrompt = `Transform this executive summary into a professional report section.

EXECUTIVE SUMMARY (raw data):
${analystResult.executiveSummary}

Write a polished 2-3 paragraph executive summary that:
- Starts with the market position
- Highlights key competitive threats
- Emphasizes critical findings
- Ends with strategic priorities

Keep the tone professional and data-driven. Do NOT add markdown headers (I'll add them).
Just return the paragraphs.`;

    const content = await this.callLlm(systemPrompt, userPrompt, 1500, 0.6);

    return `## Executive Summary

${content.trim()}`;
  }

  /**
   * Generate key insights section
   */
  private generateKeyInsightsSection(analystResult: AnalystResult): string {
    const insights = analystResult.keyInsights
      .map((insight, idx) => `${idx + 1}. **${insight}**`)
      .join('\n');

    return `## Key Insights

${insights}`;
  }

  /**
   * Generate market position section
   */
  private async generateMarketPositionSection(analystResult: AnalystResult): Promise<string> {
    const mp = analystResult.marketPosition;

    const systemPrompt = 'You are a market intelligence writer. Write clear, structured reports.';

    const userPrompt = `Transform this market position data into a professional report section.

YOUR POSITION:
${mp.yourPosition}

COMPETITIVE LANDSCAPE:
${mp.competitiveLandscape}

MARKET TRENDS:
${mp.marketTrends.join('\n')}

OPPORTUNITIES:
${mp.opportunities.join('\n')}

THREATS:
${mp.threats.join('\n')}

Write a comprehensive market position section with these subsections:
1. Current Position (2 paragraphs)
2. Competitive Landscape (2 paragraphs)
3. Market Trends (bullet points)
4. Opportunities (bullet points)
5. Threats (bullet points)

Use markdown formatting (###, **, bullets).
Make it professional and data-driven.`;

    const content = await this.callLlm(systemPrompt, userPrompt, 2500, 0.5);

    return `## Market Position & Competitive Landscape

${content.trim()}`;
  }

  /**
   * Generate competitor analysis section
   */
  private async generateCompetitorAnalysisSection(analystResult: AnalystResult): Promise<string> {
    const competitors = analystResult.competitorAnalyses;

    // Group by threat level
    const highThreat = competitors.filter((c) => c.threatLevel === 'high');
    const mediumThreat = competitors.filter((c) => c.threatLevel === 'medium');
    const lowThreat = competitors.filter((c) => c.threatLevel === 'low');

    const sections: string[] = ['## Competitor Analysis'];

    // Overview paragraph
    const systemPrompt = 'You are a competitive intelligence writer.';

    const overviewPrompt = `Write a 2-paragraph overview of the competitive landscape based on this data:

Total Competitors: ${competitors.length}
- High Threat: ${highThreat.length}
- Medium Threat: ${mediumThreat.length}
- Low Threat: ${lowThreat.length}

Market Leaders: ${competitors.filter((c) => c.marketPosition === 'leader').map((c) => c.competitorName).join(', ')}
Challengers: ${competitors.filter((c) => c.marketPosition === 'challenger').map((c) => c.competitorName).join(', ')}

Keep it concise and professional.`;

    const overview = await this.callLlm(systemPrompt, overviewPrompt, 1000, 0.5);
    sections.push(overview.trim());

    // Detailed competitor profiles
    sections.push('\n### Detailed Competitor Profiles\n');

    for (const competitor of competitors) {
      sections.push(this.formatCompetitorProfile(competitor));
    }

    return sections.join('\n\n');
  }

  /**
   * Format a single competitor profile
   */
  private formatCompetitorProfile(competitor: any): string {
    return `#### ${competitor.competitorName}

**Location:** ${competitor.location}
**Market Position:** ${this.capitalize(competitor.marketPosition)}
**Threat Level:** ${this.capitalize(competitor.threatLevel)}
**Priority:** ${this.capitalize(competitor.priority)}

**Strengths:**
${competitor.strengths.map((s: string) => `- ${s}`).join('\n')}

**Weaknesses:**
${competitor.weaknesses.map((w: string) => `- ${w}`).join('\n')}

**Key Features:**
${competitor.keyFeatures.map((f: string) => `- ${f}`).join('\n')}

**Pricing:**
- Model: ${this.capitalize(competitor.pricingModel.model)}
- Competitiveness: ${this.capitalize(competitor.pricingModel.competitiveness)}
- Details: ${competitor.pricingModel.details}

**Target Market:** ${competitor.targetMarket.join(', ')}

**Unique Selling Points:**
${competitor.uniqueSellingPoints.map((usp: string) => `- ${usp}`).join('\n')}`;
  }

  /**
   * Generate gap analysis section
   */
  private async generateGapAnalysisSection(analystResult: AnalystResult): Promise<string> {
    const gaps = analystResult.gapAnalysis;

    const sections: string[] = ['## Gap Analysis'];

    // Overview
    const highImpactGaps = gaps.filter((g) => g.impact === 'high');
    const systemPrompt = 'You are a strategic gap analyst writer.';

    const overviewPrompt = `Write a 2-paragraph overview of competitive gaps:

Total Gaps Identified: ${gaps.length}
High Impact Gaps: ${highImpactGaps.length}

Categories affected:
${[...new Set(gaps.map((g) => g.category))].join(', ')}

Focus on urgency and strategic importance.`;

    const overview = await this.callLlm(systemPrompt, overviewPrompt, 1000, 0.5);
    sections.push(overview.trim());

    // Gap details by impact
    sections.push('\n### Critical Gaps (High Impact)\n');
    const highGaps = gaps.filter((g) => g.impact === 'high');
    for (const gap of highGaps) {
      sections.push(this.formatGap(gap));
    }

    sections.push('\n### Medium Impact Gaps\n');
    const mediumGaps = gaps.filter((g) => g.impact === 'medium');
    for (const gap of mediumGaps) {
      sections.push(this.formatGap(gap));
    }

    return sections.join('\n\n');
  }

  /**
   * Format a single gap
   */
  private formatGap(gap: any): string {
    return `#### ${gap.gapTitle}

**Category:** ${this.capitalize(gap.category)}
**Your Status:** ${this.capitalize(gap.yourCompanyStatus)}
**Impact:** ${this.capitalize(gap.impact)}

**Description:**
${gap.description}

**Competitors Excelling:**
${gap.competitorsDoingWell.join(', ')}

**Recommendation:**
${gap.recommendation}`;
  }

  /**
   * Generate recommendations section
   */
  private async generateRecommendationsSection(analystResult: AnalystResult): Promise<string> {
    const recommendations = analystResult.strategicRecommendations;

    const sections: string[] = ['## Strategic Recommendations'];

    // Overview
    const criticalRecs = recommendations.filter((r) => r.priority === 'critical');
    const highRecs = recommendations.filter((r) => r.priority === 'high');

    const systemPrompt = 'You are a strategic business advisor writer.';

    const overviewPrompt = `Write a 2-paragraph introduction to strategic recommendations:

Total Recommendations: ${recommendations.length}
Critical Priority: ${criticalRecs.length}
High Priority: ${highRecs.length}

Categories: ${[...new Set(recommendations.map((r) => r.category))].join(', ')}

Emphasize action and implementation.`;

    const overview = await this.callLlm(systemPrompt, overviewPrompt, 1000, 0.6);
    sections.push(overview.trim());

    // Recommendations by priority
    sections.push('\n### Critical Priority\n');
    const critical = recommendations.filter((r) => r.priority === 'critical');
    for (const rec of critical) {
      sections.push(this.formatRecommendation(rec));
    }

    sections.push('\n### High Priority\n');
    const high = recommendations.filter((r) => r.priority === 'high');
    for (const rec of high) {
      sections.push(this.formatRecommendation(rec));
    }

    sections.push('\n### Medium Priority\n');
    const medium = recommendations.filter((r) => r.priority === 'medium');
    for (const rec of medium) {
      sections.push(this.formatRecommendation(rec));
    }

    return sections.join('\n\n');
  }

  /**
   * Format a single recommendation
   */
  private formatRecommendation(rec: any): string {
    return `#### ${rec.title}

**Category:** ${this.capitalize(rec.category)}
**Timeframe:** ${this.capitalize(rec.timeframe)}
**Expected Impact:** ${rec.expectedImpact}

**Rationale:**
${rec.rationale}

**Action Items:**
${rec.actionItems.map((item: string) => `- ${item}`).join('\n')}`;
  }

  /**
   * Generate appendix
   */
  private generateAppendix(analystResult: AnalystResult): string {
    return `## Appendix

### Data Sources
- **Total Sources Analyzed:** ${analystResult.totalSourcesAnalyzed}
- **Analysis Date:** ${new Date().toISOString()}
- **Execution Time:** ${analystResult.executionTimeMs}ms

### Methodology
This competitive intelligence report was generated through a multi-stage AI-powered analysis:
1. **Web Scraping:** Competitor websites and public information
2. **Data Extraction:** Key features, pricing, positioning
3. **Gap Analysis:** Identification of competitive disadvantages
4. **Strategic Analysis:** Recommendations based on market position
5. **Report Generation:** Professional synthesis of findings

### Competitors Analyzed
${analystResult.competitorAnalyses.map((c) => `- ${c.competitorName} (${c.location})`).join('\n')}

---

*This report was generated by an AI-powered competitive intelligence system.*
*All findings should be validated through additional research and human judgment.*`;
  }

  /**
   * Invoke the configured LLM provider
   */
  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4000,
    temperature = 0.6,
  ): Promise<string> {
    const result = await this.llmService.generateText({
      task: 'writing',
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
    });

    return result.content;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
