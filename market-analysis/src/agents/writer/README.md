# WriterAgent

The **WriterAgent** is responsible for converting structured competitive intelligence data from the AnalystAgent into professional, human-readable Markdown reports.

## Overview

- **Provider:** Groq through the shared `LlmService`
- **Default model:** `openai/gpt-oss-120b` (configurable with `GROQ_MODEL`)
- **Purpose:** Generate professional reports from analyst output
- **Input:** AnalystResult from AnalystAgent
- **Output:** Professional Markdown report

## Architecture

```
AnalystResult (structured data)
         ↓
    WriterAgent
         ↓
Professional Markdown Report
```

## Input Structure

The WriterAgent receives:

```typescript
{
  companyContext: string;           // Company description
  additionalParams: {
    analystResult: AnalystResult;   // Structured analysis data
    companyName: string;             // Company name for report header
  }
}
```

## Output Structure

```typescript
interface WriterResult {
  reportMarkdown: string;    // Full report in Markdown
  reportTitle: string;       // Report title
  generatedAt: Date;         // Timestamp
  wordCount: number;         // Total word count
  executionTimeMs: number;   // Execution time
}
```

## Report Sections

The generated report includes:

1. **Header**
   - Company name
   - Report date
   - Competitor count
   - Data source count

2. **Executive Summary**
   - Market position overview
   - Key competitive threats
   - Strategic priorities

3. **Key Insights**
   - Numbered list of critical findings

4. **Market Position & Competitive Landscape**
   - Current position
   - Competitive landscape
   - Market trends
   - Opportunities
   - Threats

5. **Competitor Analysis**
   - Overview paragraph
   - Detailed competitor profiles:
     - Location & position
     - Threat level
     - Strengths & weaknesses
     - Key features
     - Pricing model
     - Target market
     - Unique selling points

6. **Gap Analysis**
   - Overview
   - Critical gaps (high impact)
   - Medium impact gaps
   - Each gap includes:
     - Category
     - Description
     - Competitors excelling
     - Recommendation

7. **Strategic Recommendations**
   - Overview
   - Grouped by priority (critical, high, medium)
   - Each recommendation includes:
     - Category
     - Timeframe
     - Expected impact
     - Rationale
     - Action items

8. **Appendix**
   - Data sources
   - Methodology
   - Competitors analyzed

## How It Works

### 1. Report Generation Flow

```typescript
execute() → generateFullReport() → [
  generateHeader(),
  generateExecutiveSummarySection(),
  generateKeyInsightsSection(),
  generateMarketPositionSection(),
  generateCompetitorAnalysisSection(),
  generateGapAnalysisSection(),
  generateRecommendationsSection(),
  generateAppendix()
]
```

### 2. LLM-Enhanced Sections

The following sections use Claude to enhance the presentation:

- **Executive Summary:** Polishes raw data into executive-level prose
- **Market Position:** Transforms data into structured narrative
- **Competitor Overview:** Creates cohesive landscape description
- **Gap Analysis Overview:** Synthesizes urgency and strategic importance
- **Recommendations Overview:** Emphasizes action and implementation

### 3. Template-Based Sections

These sections use direct formatting:

- Header
- Key Insights
- Competitor Profiles (individual)
- Gap Details
- Recommendation Details
- Appendix

## Shared LLM Integration

### Configuration

```typescript
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
```

### API Call Pattern

```typescript
const result = await this.llmService.generateText({
  systemPrompt,
  userPrompt,
  maxTokens: 4000,
  temperature: 0.6,
});
```

## Environment Variables

Required:
- `GROQ_API_KEY` - Groq API key
- `GROQ_MODEL` - Optional Groq model ID

## Usage

### Standalone

```typescript
const writerAgent = new WriterAgent();

const result = await writerAgent.execute({
  organizationId: 'org-123',
  researchJobId: 'job-456',
  companyContext: 'Company description...',
  additionalParams: {
    analystResult: {...},  // AnalystResult object
    companyName: 'Acme Corp'
  }
});

if (result.success) {
  console.log(result.data.reportMarkdown);
  console.log(`Word count: ${result.data.wordCount}`);
}
```

### In Research Orchestration

The WriterAgent is automatically called by `ResearchService` after the AnalystAgent completes.

## Error Handling

The agent handles errors gracefully:

```typescript
try {
  // Generation logic
} catch (error) {
  return this.createErrorResult(error);
}
```

Common errors:
- Missing analyst result
- Missing Groq API key
- Groq API or rate-limit failures
- JSON parsing errors (shouldn't happen with prose generation)

## Performance

Typical execution:
- **Time:** 10-20 seconds (depends on data size)
- **Word Count:** 2,000 - 5,000 words
- **Tokens Used:** ~3,000 - 8,000 output tokens
- **LLM Calls:** 5-7 (one per LLM-enhanced section)

## Testing

Run tests:

```bash
npm run test -- writer.agent.spec.ts
```

## Best Practices

1. **Always validate input:** Check for analystResult presence
2. **Use appropriate temperature:** 0.6 for creative writing, 0.4-0.5 for structured content
3. **Monitor token usage:** Track costs per report
4. **Cache where possible:** Consider caching company context
5. **Handle rate limits:** Implement retry logic in the shared LLM service

## Future Enhancements

Potential improvements:
- [ ] PDF generation
- [ ] Custom report templates
- [ ] Multi-language support
- [ ] Chart/graph generation
- [ ] Export to DOCX/PowerPoint
- [ ] Executive summary only mode
- [ ] Custom branding/styling

## Related Components

- **AnalystAgent:** Provides structured input data
- **ResearchService:** Orchestrates the agent pipeline
- **BaseAgent:** Parent class providing logging/utilities

## License

Internal use only.
