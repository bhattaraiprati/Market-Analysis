/**
 * Analyst Agent
 * Analyzes competitor data and generates strategic insights
 * Uses: Groq (Llama 3.3) for deep reasoning and structured analysis
 */

import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { BaseAgent } from '../base/base.agent';
import {
  AgentContext,
  AgentResult,
  ScrapedSource,
  CompetitorInfo,
} from '../base/agent.types';
import { CompanyContextService } from '../../company-context/company-context.service';

/**
 * Structured analysis result
 */
export interface CompetitorAnalysis {
  competitorName: string;
  location: string;
  priority: 'domestic' | 'international';

  // Core Analysis
  strengths: string[];
  weaknesses: string[];
  keyFeatures: string[];
  pricingModel: PricingAnalysis;
  targetMarket: string[];
  uniqueSellingPoints: string[];

  // Metrics
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  threatLevel: 'high' | 'medium' | 'low';

  // Sources used
  analyzedPages: string[];
}

export interface PricingAnalysis {
  model: 'freemium' | 'subscription' | 'transaction-based' | 'enterprise' | 'free' | 'unknown';
  details: string;
  competitiveness: 'cheaper' | 'similar' | 'expensive' | 'unknown';
}

export interface GapAnalysis {
  category: 'feature' | 'pricing' | 'market' | 'technology' | 'service';
  gapTitle: string;
  description: string;
  competitorsDoingWell: string[];
  yourCompanyStatus: 'missing' | 'weak' | 'average';
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface StrategicRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'differentiation' | 'pricing' | 'features' | 'marketing' | 'expansion';
  title: string;
  rationale: string;
  actionItems: string[];
  expectedImpact: string;
  timeframe: 'immediate' | 'short-term' | 'mid-term' | 'long-term';
}

export interface MarketPosition {
  yourPosition: string;
  competitiveLandscape: string;
  marketTrends: string[];
  opportunities: string[];
  threats: string[];
}

export interface AnalystResult {
  // Individual competitor analyses
  competitorAnalyses: CompetitorAnalysis[];

  // Cross-competitor insights
  gapAnalysis: GapAnalysis[];
  strategicRecommendations: StrategicRecommendation[];
  marketPosition: MarketPosition;

  // Summary
  executiveSummary: string;
  keyInsights: string[];

  // Metadata
  totalCompetitorsAnalyzed: number;
  totalSourcesAnalyzed: number;
  executionTimeMs: number;
}

@Injectable()
export class AnalystAgent extends BaseAgent<AnalystResult> {
  private readonly groq: Groq;

  constructor(private readonly companyContextService: CompanyContextService) {
    super('AnalystAgent');

    // Initialize Groq SDK
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  /**
   * Main execution method
   */
  async execute(context: AgentContext): Promise<AgentResult<AnalystResult>> {
    this.logStart(`Starting competitive analysis for organization ${context.organizationId}`);

    const startTime = Date.now();

    try {
      // 1. Get organization details
      const orgData = await this.companyContextService.getOrganization(
        context.organizationId,
      );

      this.logger.log(`📋 Analyzing for: ${orgData.name} (${orgData.industry})`);

      // 2. Get scraped sources from context (passed by orchestrator)
      const sources = context.additionalParams?.sources as ScrapedSource[];
      const competitors = context.additionalParams?.competitors as CompetitorInfo[];

      if (!sources || !competitors) {
        throw new Error('No competitor data provided. Run SearcherAgent first.');
      }

      this.logger.log(`📊 Analyzing ${sources.length} sources from ${competitors.length} competitors`);

      // 3. Group sources by competitor
      const sourcesByCompetitor = this.groupSourcesByCompetitor(sources);

      // 4. Analyze each competitor individually
      this.logStart('Analyzing individual competitors...');
      const competitorAnalyses = await this.analyzeCompetitors(
        sourcesByCompetitor,
        competitors,
        context.companyContext,
      );

      this.logSuccess(`Analyzed ${competitorAnalyses.length} competitors`);

      // 5. Perform gap analysis
      this.logStart('Performing gap analysis...');
      const gapAnalysis = await this.performGapAnalysis(
        competitorAnalyses,
        context.companyContext,
        orgData,
      );

      this.logSuccess(`Identified ${gapAnalysis.length} strategic gaps`);

      // 6. Generate strategic recommendations
      this.logStart('Generating strategic recommendations...');
      const strategicRecommendations = await this.generateRecommendations(
        competitorAnalyses,
        gapAnalysis,
        context.companyContext,
        orgData,
      );

      this.logSuccess(`Generated ${strategicRecommendations.length} recommendations`);

      // 7. Analyze market position
      this.logStart('Analyzing market position...');
      const marketPosition = await this.analyzeMarketPosition(
        competitorAnalyses,
        context.companyContext,
        orgData,
      );

      this.logSuccess('Market position analysis complete');

      // 8. Generate executive summary
      this.logStart('Generating executive summary...');
      const { executiveSummary, keyInsights } = await this.generateExecutiveSummary(
        competitorAnalyses,
        gapAnalysis,
        strategicRecommendations,
        marketPosition,
        orgData,
      );

      this.logSuccess('Executive summary generated');

      const executionTimeMs = Date.now() - startTime;

      return this.createSuccessResult<AnalystResult>(
        {
          competitorAnalyses,
          gapAnalysis,
          strategicRecommendations,
          marketPosition,
          executiveSummary,
          keyInsights,
          totalCompetitorsAnalyzed: competitorAnalyses.length,
          totalSourcesAnalyzed: sources.length,
          executionTimeMs,
        },
        {
          competitorsAnalyzed: competitorAnalyses.length,
          gapsIdentified: gapAnalysis.length,
          recommendationsGenerated: strategicRecommendations.length,
        },
      );
    } catch (error) {
      this.logError('Analyst agent failed', error);
      return this.createErrorResult(error);
    }
  }

  /**
   * Group sources by competitor name
   */
  private groupSourcesByCompetitor(
    sources: ScrapedSource[],
  ): Map<string, ScrapedSource[]> {
    const grouped = new Map<string, ScrapedSource[]>();

    for (const source of sources) {
      const competitorName = source.metadata?.competitorName as string;
      if (!competitorName) continue;

      if (!grouped.has(competitorName)) {
        grouped.set(competitorName, []);
      }
      grouped.get(competitorName)!.push(source);
    }

    return grouped;
  }

  /**
   * Analyze each competitor individually
   */
  private async analyzeCompetitors(
    sourcesByCompetitor: Map<string, ScrapedSource[]>,
    competitors: CompetitorInfo[],
    companyContext: string,
  ): Promise<CompetitorAnalysis[]> {
    const analyses: CompetitorAnalysis[] = [];

    // Analyze in batches of 3 to avoid rate limits
    const competitorNames = Array.from(sourcesByCompetitor.keys());
    const batchSize = 3;

    for (let i = 0; i < competitorNames.length; i += batchSize) {
      const batch = competitorNames.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((name) => {
          const sources = sourcesByCompetitor.get(name)!;
          const competitor = competitors.find((c) => c.name === name);
          return this.analyzeCompetitor(name, sources, competitor, companyContext);
        }),
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          analyses.push(result.value);
          this.logger.log(`✅ Analyzed: ${batch[idx]} (${result.value.keyFeatures.length} features identified)`);
        } else {
          this.logger.warn(`⚠️ Failed to analyze: ${batch[idx]}`);
        }
      });

      // Rate limiting
      if (i + batchSize < competitorNames.length) {
        await this.sleep(2000);
      }
    }

    return analyses;
  }

  /**
   * Analyze a single competitor
   */
  private async analyzeCompetitor(
    competitorName: string,
    sources: ScrapedSource[],
    competitor: CompetitorInfo | undefined,
    companyContext: string,
  ): Promise<CompetitorAnalysis | null> {
    // Combine all scraped content
    const combinedContent = this.combineSourceContent(sources);

    // Truncate if too long (Groq has token limits)
    const maxLength = 15000; // ~4000 tokens
    const truncatedContent = combinedContent.length > maxLength
      ? combinedContent.substring(0, maxLength) + '\n\n[Content truncated due to length...]'
      : combinedContent;

    const prompt = `You are a competitive intelligence analyst. Analyze this competitor deeply and provide structured insights.

YOUR COMPANY CONTEXT:
${companyContext}

COMPETITOR NAME: ${competitorName}
COMPETITOR LOCATION: ${competitor?.location || 'Unknown'}
PRIORITY: ${competitor?.priority || 'unknown'}

COMPETITOR'S WEB CONTENT:
${truncatedContent}

Analyze this competitor comprehensively and return ONLY a JSON object in this EXACT format:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
  "pricingModel": {
    "model": "freemium|subscription|transaction-based|enterprise|free|unknown",
    "details": "brief description of pricing",
    "competitiveness": "cheaper|similar|expensive|unknown"
  },
  "targetMarket": ["segment 1", "segment 2"],
  "uniqueSellingPoints": ["USP 1", "USP 2"],
  "marketPosition": "leader|challenger|follower|niche",
  "threatLevel": "high|medium|low"
}

IMPORTANT:
- Be specific and data-driven
- Focus on competitive advantages/disadvantages
- Identify what makes them different
- Consider their threat to YOUR company
- Use actual information from the content
- Return ONLY valid JSON, no other text

JSON:`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive intelligence expert. Return only valid JSON objects.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4, // Lower for more consistent analysis
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        competitorName,
        location: competitor?.location || 'Unknown',
        priority: competitor?.priority || 'international',
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        keyFeatures: analysis.keyFeatures || [],
        pricingModel: analysis.pricingModel || { model: 'unknown', details: '', competitiveness: 'unknown' },
        targetMarket: analysis.targetMarket || [],
        uniqueSellingPoints: analysis.uniqueSellingPoints || [],
        marketPosition: analysis.marketPosition || 'follower',
        threatLevel: analysis.threatLevel || 'medium',
        analyzedPages: sources.map((s) => s.url),
      };
    } catch (error) {
      this.logError(`Failed to analyze ${competitorName}`, error);
      return null;
    }
  }

  /**
   * Perform gap analysis
   */
  private async performGapAnalysis(
    competitorAnalyses: CompetitorAnalysis[],
    companyContext: string,
    orgData: any,
  ): Promise<GapAnalysis[]> {
    // Aggregate all competitor features and strengths
    const allFeatures = new Set<string>();
    const allStrengths = new Set<string>();

    competitorAnalyses.forEach((analysis) => {
      analysis.keyFeatures.forEach((f) => allFeatures.add(f));
      analysis.strengths.forEach((s) => allStrengths.add(s));
    });

    const competitorCapabilities = Array.from(allFeatures).concat(Array.from(allStrengths));

    const prompt = `You are a strategic gap analyst. Identify competitive gaps for this company.

YOUR COMPANY:
${companyContext}

COMPETITOR CAPABILITIES (what competitors are doing well):
${competitorCapabilities.slice(0, 50).join('\n')}

COMPETITOR ANALYSES:
${competitorAnalyses.map((a) => `
${a.competitorName}:
- Position: ${a.marketPosition}
- Threat: ${a.threatLevel}
- Key Features: ${a.keyFeatures.slice(0, 5).join(', ')}
- USPs: ${a.uniqueSellingPoints.join(', ')}
`).join('\n')}

Identify 5-8 critical gaps where YOUR company is behind competitors.

Return ONLY a JSON array in this EXACT format:
[
  {
    "category": "feature|pricing|market|technology|service",
    "gapTitle": "Short gap title",
    "description": "Detailed description of the gap",
    "competitorsDoingWell": ["Competitor 1", "Competitor 2"],
    "yourCompanyStatus": "missing|weak|average",
    "impact": "high|medium|low",
    "recommendation": "How to address this gap"
  }
]

Focus on:
- Features competitors have that you don't
- Market segments they serve better
- Pricing advantages they have
- Technology they use better
- Customer experience gaps

Return ONLY valid JSON, no other text.

JSON:`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a strategic gap analyst. Return only valid JSON arrays.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const gaps: GapAnalysis[] = JSON.parse(jsonMatch[0]);
      return gaps;
    } catch (error) {
      this.logError('Failed to perform gap analysis', error);
      return [];
    }
  }

  /**
   * Generate strategic recommendations
   */
  private async generateRecommendations(
    competitorAnalyses: CompetitorAnalysis[],
    gapAnalysis: GapAnalysis[],
    companyContext: string,
    orgData: any,
  ): Promise<StrategicRecommendation[]> {
    const prompt = `You are a strategic advisor. Generate actionable recommendations for this company.

YOUR COMPANY:
${companyContext}

BUSINESS GOALS:
${orgData.business_goals}

CURRENT CHALLENGES:
${orgData.current_challenges || 'Not specified'}

IDENTIFIED GAPS:
${gapAnalysis.map((g) => `- ${g.gapTitle} (${g.impact} impact): ${g.description}`).join('\n')}

TOP COMPETITORS:
${competitorAnalyses.slice(0, 5).map((a) => `- ${a.competitorName} (${a.marketPosition}, ${a.threatLevel} threat)`).join('\n')}

Generate 6-10 strategic recommendations that are:
- Specific and actionable
- Prioritized by impact
- Realistic to implement
- Data-driven based on competitor analysis

Return ONLY a JSON array in this EXACT format:
[
  {
    "priority": "critical|high|medium|low",
    "category": "differentiation|pricing|features|marketing|expansion",
    "title": "Clear recommendation title",
    "rationale": "Why this is important based on competitor analysis",
    "actionItems": ["Action 1", "Action 2", "Action 3"],
    "expectedImpact": "Expected business impact",
    "timeframe": "immediate|short-term|mid-term|long-term"
  }
]

Return ONLY valid JSON, no other text.

JSON:`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a strategic business advisor. Return only valid JSON arrays.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const recommendations: StrategicRecommendation[] = JSON.parse(jsonMatch[0]);
      return recommendations;
    } catch (error) {
      this.logError('Failed to generate recommendations', error);
      return [];
    }
  }

  /**
   * Analyze market position
   */
  private async analyzeMarketPosition(
    competitorAnalyses: CompetitorAnalysis[],
    companyContext: string,
    orgData: any,
  ): Promise<MarketPosition> {
    const prompt = `You are a market analyst. Analyze this company's position in the competitive landscape.

YOUR COMPANY:
${companyContext}

LOCATION: ${orgData.location}

COMPETITIVE LANDSCAPE:
${competitorAnalyses.map((a) => `
${a.competitorName} (${a.location}):
- Position: ${a.marketPosition}
- Threat Level: ${a.threatLevel}
- USPs: ${a.uniqueSellingPoints.join(', ')}
- Target Market: ${a.targetMarket.join(', ')}
`).join('\n')}

Analyze the market and return ONLY a JSON object in this EXACT format:
{
  "yourPosition": "Your company's current market position and standing",
  "competitiveLandscape": "Overview of the competitive environment",
  "marketTrends": ["trend 1", "trend 2", "trend 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "threats": ["threat 1", "threat 2", "threat 3"]
}

Be specific about:
- Where your company stands vs competitors
- Market dynamics and trends
- Untapped opportunities
- Competitive threats

Return ONLY valid JSON, no other text.

JSON:`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a market intelligence analyst. Return only valid JSON objects.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const position: MarketPosition = JSON.parse(jsonMatch[0]);
      return position;
    } catch (error) {
      this.logError('Failed to analyze market position', error);
      return {
        yourPosition: 'Unable to determine',
        competitiveLandscape: 'Analysis failed',
        marketTrends: [],
        opportunities: [],
        threats: [],
      };
    }
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    competitorAnalyses: CompetitorAnalysis[],
    gapAnalysis: GapAnalysis[],
    strategicRecommendations: StrategicRecommendation[],
    marketPosition: MarketPosition,
    orgData: any,
  ): Promise<{ executiveSummary: string; keyInsights: string[] }> {
    const criticalGaps = gapAnalysis.filter((g) => g.impact === 'high');
    const criticalRecommendations = strategicRecommendations.filter((r) => r.priority === 'critical' || r.priority === 'high');

    const prompt = `You are a business intelligence executive. Create an executive summary of this competitive analysis.

COMPANY: ${orgData.name}
COMPETITORS ANALYZED: ${competitorAnalyses.length}

MARKET POSITION:
${marketPosition.yourPosition}

CRITICAL GAPS (${criticalGaps.length}):
${criticalGaps.map((g) => `- ${g.gapTitle}`).join('\n')}

TOP RECOMMENDATIONS (${criticalRecommendations.length}):
${criticalRecommendations.map((r) => `- ${r.title}`).join('\n')}

OPPORTUNITIES:
${marketPosition.opportunities.join(', ')}

THREATS:
${marketPosition.threats.join(', ')}

Create an executive summary and key insights.

Return ONLY a JSON object in this EXACT format:
{
  "executiveSummary": "2-3 paragraph executive summary covering: market position, key threats, critical gaps, and top priorities",
  "keyInsights": [
    "Insight 1: specific finding",
    "Insight 2: specific finding",
    "Insight 3: specific finding",
    "Insight 4: specific finding",
    "Insight 5: specific finding"
  ]
}

Make it:
- Concise but comprehensive
- Action-oriented
- Data-driven
- Executive-friendly (no jargon)

Return ONLY valid JSON, no other text.

JSON:`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence executive. Return only valid JSON objects.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const summary = JSON.parse(jsonMatch[0]);
      return {
        executiveSummary: summary.executiveSummary || 'Summary generation failed',
        keyInsights: summary.keyInsights || [],
      };
    } catch (error) {
      this.logError('Failed to generate executive summary', error);
      return {
        executiveSummary: 'Analysis complete. Review detailed sections for insights.',
        keyInsights: [],
      };
    }
  }

  /**
   * Combine multiple source contents into one document
   */
  private combineSourceContent(sources: ScrapedSource[]): string {
    const sections: string[] = [];

    sources.forEach((source) => {
      const pageType = source.metadata?.pageType || 'page';
      sections.push(`\n--- ${pageType.toUpperCase()}: ${source.title} ---`);
      sections.push(source.content);
    });

    return sections.join('\n\n');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
