# Quick Start: Get AnalystAgent Working Now! 🚀

## ⚡ 3-Step Setup (5 minutes)

### Step 1: Update Database (Required)
```bash
# Connect to PostgreSQL
psql -U postgres -d market_analysis

# Run this SQL
ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS output_results JSONB;
ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

# Verify (should show new columns)
\d research_jobs
```

### Step 2: Restart Server
```bash
# Stop server if running (Ctrl+C)

# Start server
npm run start:dev

# You should see both agents load:
# ✅ SearcherAgent initialized
# ✅ AnalystAgent initialized
```

### Step 3: Test It!
```bash
# Trigger research (replace with your actual organization ID)
curl -X POST http://localhost:3000/research/start \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-id-here",
    "userId": "test-user"
  }'
```

---

## 📺 Watch the Logs

You should see this sequence:

```
[ResearchService] 🔍 Starting SearcherAgent for job abc-123...
[SearcherAgent] 🤖 Starting competitor search for organization org-456
[SearcherAgent] 📋 Organization: YourCompany (Fintech)
[SearcherAgent] 📍 Location: Nepal
[SearcherAgent] 🎯 Known Competitors: Khalti, eSewa, IME Pay
...
[SearcherAgent] ✅ Successfully scraped 87 sources
[ResearchService] ✅ SearcherAgent completed: 87 sources scraped
[ResearchService] 📦 Stored 87 sources for job abc-123

[ResearchService] 🧠 Starting AnalystAgent for job abc-123...
[AnalystAgent] 🤖 Starting competitive analysis for organization org-456
[AnalystAgent] 📋 Analyzing for: YourCompany (Fintech)
[AnalystAgent] 📊 Analyzing 87 sources from 10 competitors
[AnalystAgent] 🤖 Analyzing individual competitors...
[AnalystAgent] ✅ Analyzed: Khalti (6 features identified)
[AnalystAgent] ✅ Analyzed: eSewa (5 features identified)
[AnalystAgent] ✅ Analyzed: IME Pay (7 features identified)
...
[AnalystAgent] 🤖 Performing gap analysis...
[AnalystAgent] ✅ Identified 7 strategic gaps
[AnalystAgent] 🤖 Generating strategic recommendations...
[AnalystAgent] ✅ Generated 8 recommendations
[AnalystAgent] 🤖 Analyzing market position...
[AnalystAgent] ✅ Market position analysis complete
[AnalystAgent] 🤖 Generating executive summary...
[AnalystAgent] ✅ Executive summary generated

[ResearchService] ✅ AnalystAgent completed: 10 competitors analyzed
[ResearchService] 📊 Stored analysis results for job abc-123
[ResearchService]    - 10 competitors analyzed
[ResearchService]    - 7 gaps identified
[ResearchService]    - 8 recommendations generated
[ResearchService] 🎉 Research job abc-123 completed successfully
```

---

## ✅ Success Indicators

| What to Check | Expected Result |
|---------------|-----------------|
| Server starts | No errors, both agents load |
| API call | Returns `{"jobId": "...", "message": "..."}` |
| Logs | See "🧠 Starting AnalystAgent..." after SearcherAgent |
| Database | Job status = "COMPLETED", output_results populated |
| Timing | ~3 minutes total (2 min scrape + 1 min analyze) |

---

## ❌ If Something's Wrong

### Problem: Server won't start
```bash
# Error: Cannot find module 'AnalystAgent'
# Solution: Check that all files were created

ls src/agents/analyst/
# Should show:
# analyst.agent.ts
# analyst.module.ts
```

### Problem: Database error
```bash
# Error: column "output_results" does not exist
# Solution: Run the migration again

psql -U postgres -d market_analysis
ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS output_results JSONB;
ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP;
```

### Problem: AnalystAgent never starts
```bash
# Check if SearcherAgent completed successfully
# Look for: ✅ SearcherAgent completed: X sources scraped

# If missing, SearcherAgent failed - check errors above
# If present but no AnalystAgent log, check research.service.ts integration
```

### Problem: Analysis is empty
```bash
# Check Groq API key
cat .env | grep GROQ_API_KEY

# Should show: GROQ_API_KEY=gsk_...
# If not, add it to .env file
```

---

## 🎯 Quick Verification Query

```sql
-- Check latest research job
SELECT 
  id,
  status,
  research_type,
  analyzed_at,
  output_results->'executiveSummary' as summary,
  jsonb_array_length(output_results->'competitorAnalyses') as competitors_analyzed,
  jsonb_array_length(output_results->'gapAnalysis') as gaps_found,
  jsonb_array_length(output_results->'strategicRecommendations') as recommendations
FROM research_jobs
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
```
status: COMPLETED
analyzed_at: [timestamp]
competitors_analyzed: 10
gaps_found: 7
recommendations: 8
```

---

## 📊 View Analysis Results

### Option 1: Direct Database Query
```sql
SELECT 
  output_results->'executiveSummary' as executive_summary,
  output_results->'keyInsights' as key_insights
FROM research_jobs
WHERE id = 'your-job-id';
```

### Option 2: Create API Endpoint

Add to `research.controller.ts`:

```typescript
@Get('jobs/:jobId/analysis')
async getAnalysis(
  @Param('jobId') jobId: string,
  @Query('organizationId') organizationId: string,
) {
  const job = await this.researchService.getJobStatus(jobId, organizationId);
  return {
    success: true,
    data: job.output_results,
  };
}
```

Then call:
```bash
curl "http://localhost:3000/research/jobs/your-job-id/analysis?organizationId=your-org-id"
```

---

## 🔥 Pro Tip: Pretty Print Analysis

```bash
# Get analysis and format as JSON
curl -s "http://localhost:3000/research/jobs/your-job-id/analysis?organizationId=your-org-id" | jq '.'

# Extract just executive summary
curl -s "http://localhost:3000/research/jobs/your-job-id/analysis?organizationId=your-org-id" | jq -r '.data.executiveSummary'

# Extract just key insights
curl -s "http://localhost:3000/research/jobs/your-job-id/analysis?organizationId=your-org-id" | jq -r '.data.keyInsights[]'

# Count gaps by impact
curl -s "http://localhost:3000/research/jobs/your-job-id/analysis?organizationId=your-org-id" | jq '[.data.gapAnalysis[] | .impact] | group_by(.) | map({impact: .[0], count: length})'
```

---

## ⏱️ Timeline Expectations

| Stage | Time | What's Happening |
|-------|------|------------------|
| 0-10s | Setup | Load context, create job |
| 10s-2m | Scraping | SearcherAgent finding and scraping competitors |
| 2-2.5m | Transition | Storing sources, loading data for analysis |
| 2.5-3.5m | Analysis | AnalystAgent analyzing all competitors |
| 3.5m | Complete | Storing results, updating database |

**Total: ~3-4 minutes** for 10 competitors with 8-10 pages each

---

## 🎉 You're Done!

Once you see:
```
🎉 Research job abc-123 completed successfully
```

Your system is working perfectly! 🚀

**What you now have:**
- ✅ Automated competitor discovery
- ✅ Deep competitive analysis
- ✅ Gap identification
- ✅ Strategic recommendations
- ✅ Market position insights
- ✅ Executive summaries

**Ready to build on top of this:**
- 📊 Dashboard to visualize insights
- 📄 PDF report generation (WriterAgent)
- 📧 Email alerts for critical findings
- 🔄 Scheduled re-analysis (weekly/monthly)
- 📈 Trend tracking over time

---

## 🆘 Still Having Issues?

1. **Check all files exist:**
   ```bash
   ls src/agents/analyst/
   # Should show: analyst.agent.ts, analyst.module.ts
   ```

2. **Check database columns:**
   ```bash
   psql -U postgres -d market_analysis -c "\d research_jobs"
   # Should show: output_results, analyzed_at
   ```

3. **Check imports:**
   ```bash
   grep -r "AnalystModule" src/research/
   # Should show it's imported in research.module.ts
   
   grep -r "AnalystAgent" src/research/
   # Should show it's injected in research.service.ts
   ```

4. **Check environment:**
   ```bash
   grep GROQ .env
   # Should show: GROQ_API_KEY=gsk_...
   ```

If everything checks out but still not working, share the error message and I'll help debug! 🛠️

**Happy analyzing!** 🎯
