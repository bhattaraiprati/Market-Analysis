# Deep Page Scraping Implementation Guide

## Overview
The SearcherAgent now performs **two-pass scraping**:
1. **First Pass**: Scrape competitor homepages (10-15 competitors)
2. **Second Pass**: Intelligently scrape 5-7 important deep pages per competitor

---

## New Features

### 1. **Intelligent URL Extraction**
- Extracts all internal URLs from homepage markdown
- Filters out external links, anchors, and file downloads
- Resolves relative URLs to absolute URLs

### 2. **Priority-Based URL Scoring**
URLs are scored based on importance:

#### High Priority (100-80 points)
- **Pricing**: `/pricing`, `/plans`, `/charges`, `/fees`
- **Limits**: `/transaction-limit`, `/limits`
- **About**: `/about-us`, `/company`, `/who-we-are`
- **Business**: `/business`, `/enterprise`, `/merchant`, `/payment-gateway`

#### Medium Priority (70-50 points)
- **Features**: `/features`, `/products`, `/services`
- **Support**: `/faq`, `/help`, `/support`
- **API**: `/api`, `/developers`, `/integration`, `/documentation`

#### Low Priority (40-20 points)
- **Blog**: `/blog`, `/news`, `/press`
- **Partners**: `/partners`, `/partnership`

### 3. **Automatic Exclusions**
These pages are **automatically excluded**:
- Login/Register pages
- Privacy/Terms/Legal pages
- Career/Jobs pages
- Download/App Store links
- File downloads (PDF, images, etc.)
- Anchor links (`#`)

### 4. **Smart Metadata**
Each scraped source now includes:
```typescript
{
  url: string;
  title: string;
  content: string;
  sourceType: SourceType.COMPETITOR;
  metadata: {
    competitorName: string;
    location: string;
    priority: 'domestic' | 'international';
    description: string;
    pageType: 'homepage' | 'pricing' | 'limits' | 'about' | 'business' | 'features' | 'support' | 'api' | 'blog' | 'other';
  };
  scrapedAt: Date;
}
```

---

## Example: Khalti Website

### Homepage Analysis
From the Khalti homepage markdown you provided, the agent would extract:

**High Priority URLs** (will be scraped):
1. `/info/charges` - Pricing (score: 100)
2. `/info/transaction-limits` - Limits (score: 95)
3. `/about/` - About (score: 90)
4. `/payment-gateway` - Business (score: 85)
5. `/business-solutions` - Business (score: 85)

**Medium Priority URLs** (will be scraped):
6. `/qr-merchant-payment` - Features (score: 70)
7. `/info/support` - Support (score: 65)

**Excluded URLs** (will NOT be scraped):
- `https://web.khalti.com/#/login` - Login page
- `https://web.khalti.com/#/join` - Register page
- `/info/privacy-policy` - Privacy
- `/info/terms` - Terms
- `http://blog.khalti.com/careers/` - Careers
- `mailto:support@khalti.com` - Email link

### Expected Output
For Khalti, you would get:
- **1 homepage source** (main page)
- **7 deep page sources** (pricing, limits, about, payment-gateway, business-solutions, qr-merchant, support)
- **Total: 8 sources** for this competitor

---

## Configuration

### Adjustable Parameters

You can easily tune these settings in the code:

```typescript
// Maximum deep pages per competitor (default: 7)
private scoreAndSelectPriorityUrls(urls: string[], baseUrl: string, maxUrls = 7)

// Batch size for scraping (default: 2)
const batchSize = 2;

// Retry attempts (default: 2)
private async safeScrape(url: string, competitor: CompetitorInfo, retries = 2)

// Minimum content length (default: 200 chars)
if (result.markdown.length < 200) {
  // Skip
}

// Rate limiting
await this.sleep(1000); // 1s between batches
await this.sleep(1500); // 1.5s between competitors
```

---

## Rate Limiting Strategy

To avoid overwhelming Firecrawl API:

1. **Homepage Scraping**: 3 competitors per batch, 2s delay between batches
2. **Deep Page Scraping**: 2 pages per batch, 1s delay between batches
3. **Between Competitors**: 1.5s delay
4. **Retry Logic**: Exponential backoff (1s, 2s, 3s)

### Estimated Time
For 10 competitors with 7 deep pages each:
- Homepages: ~20-30 seconds
- Deep pages: ~70-90 seconds
- **Total: ~2 minutes**

---

## Error Handling

### Graceful Failures
- If a URL fails after retries, it's logged and skipped
- Other URLs continue to be scraped
- Short content (< 200 chars) is automatically skipped
- Invalid URLs are filtered out

### Logging
The agent provides detailed logging:
```
🔍 Starting deep page analysis for 10 homepages...

📄 Analyzing homepage: Khalti (https://khalti.com)
  📋 Found 47 candidate URLs
  ✅ Selected 7 priority URLs for deep scraping
     - PRICING: https://khalti.com/info/charges
     - LIMITS: https://khalti.com/info/transaction-limits
     - ABOUT: https://khalti.com/about/
     - BUSINESS: https://khalti.com/payment-gateway
     - BUSINESS: https://khalti.com/business-solutions
     - FEATURES: https://khalti.com/qr-merchant-payment
     - SUPPORT: https://khalti.com/info/support
  ✅ Successfully scraped 7/7 deep pages for Khalti
```

---

## Testing

### Basic Test
```bash
# Run the research service
npm run start:dev

# Trigger a research job via API
curl -X POST http://localhost:3000/research/start \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-id",
    "companyContext": "Digital payment platform in Nepal"
  }'
```

### Expected Results
Check the returned `sources` array:
- Should have ~8-15 sources per competitor
- Each source should have `metadata.pageType`
- Should see mix of 'homepage', 'pricing', 'limits', 'about', etc.

### Debugging
Enable detailed logs:
```typescript
// In searcher.agent.ts, all logs are already included
// Check console output for:
this.logger.log(`📄 Analyzing homepage: ${competitor.name}`)
this.logger.log(`  ✅ Selected ${priorityUrls.length} priority URLs`)
```

---

## Database Impact

### ScrapedSource Storage
If you're storing sources in the database, ensure your schema supports:
- `metadata` as JSONB (PostgreSQL) or JSON (MySQL)
- `pageType` field in metadata
- Increased storage for 8x more sources per competitor

### Example Query
```sql
-- Get all pricing pages
SELECT * FROM scraped_sources 
WHERE metadata->>'pageType' = 'pricing';

-- Count sources by page type
SELECT 
  metadata->>'pageType' as page_type,
  COUNT(*) as count
FROM scraped_sources
GROUP BY metadata->>'pageType';
```

---

## Advanced Customization

### Adding New Page Types
```typescript
// In detectPageType() method
if (/\b(custom-keyword)\b/.test(urlLower)) {
  return 'custom-type';
}
```

### Adjusting Priority Scores
```typescript
// In scoreAndSelectPriorityUrls() method
const priorityPatterns: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /\b(pricing)\b/i, score: 100 }, // Increase to 120 for higher priority
  { pattern: /\b(new-priority)\b/i, score: 110 }, // Add new pattern
];
```

### Custom URL Filtering
```typescript
// In shouldExcludeUrl() method
const excludePatterns = [
  /\b(custom-exclude)\b/, // Add custom exclusions
];
```

---

## Troubleshooting

### Issue: Too Many URLs Selected
**Solution**: Reduce `maxUrls` parameter
```typescript
const priorityUrls = this.scoreAndSelectPriorityUrls(candidateUrls, baseUrl, 5); // Reduce from 7 to 5
```

### Issue: Rate Limit Errors
**Solution**: Increase delays
```typescript
await this.sleep(2000); // Increase from 1000ms to 2000ms
```

### Issue: Poor Quality Deep Pages
**Solution**: Increase minimum content length
```typescript
if (result.markdown.length < 500) { // Increase from 200 to 500
  return null;
}
```

### Issue: Missing Important Pages
**Solution**: Check priority patterns and add missing keywords
```typescript
{ pattern: /\b(missing-keyword)\b/i, score: 95 },
```

---

## Performance Optimization

### For Large Scale (50+ competitors)
1. **Reduce deep pages**: Set `maxUrls = 5`
2. **Increase batch size**: Set `batchSize = 3`
3. **Reduce retries**: Set `retries = 1`
4. **Use caching**: Store scraped sources and skip if recently scraped

### For High Quality (10-15 competitors)
1. **Increase deep pages**: Set `maxUrls = 10`
2. **Keep retries**: Set `retries = 3`
3. **Add manual verification**: Review extracted URLs before scraping

---

## Next Steps

### Recommended Enhancements
1. **LLM-Based URL Selection**: Use Groq to intelligently select URLs based on homepage content
2. **Adaptive Depth**: Scrape more pages for important competitors, fewer for others
3. **Content Quality Scoring**: Rank scraped pages by content quality/relevance
4. **Incremental Updates**: Only re-scrape changed pages
5. **Multi-Language Support**: Handle non-English pages properly

---

## Summary

✅ **Implemented Features**:
- Intelligent URL extraction from homepage markdown
- Priority-based URL scoring (high/medium/low)
- Automatic exclusion of non-informative pages
- Batch scraping with rate limiting
- Retry logic with exponential backoff
- Page type detection and metadata
- Detailed logging and error handling

✅ **Ready for Production**:
- Clean, TypeScript code
- Consistent with existing BaseAgent style
- Configurable parameters
- Graceful error handling
- Comprehensive logging

🚀 **Expected Impact**:
- **8x more data** per competitor (1 homepage → 8 total sources)
- **Higher quality insights** from pricing, limits, and business pages
- **Better competitive intelligence** with structured page types
- **Minimal API overhead** with smart batching and rate limiting
