import { CompanyWebsiteIngestionService } from './company-website-ingestion.service';

describe('CompanyWebsiteIngestionService', () => {
  const service = new CompanyWebsiteIngestionService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it('starts ingestion whenever a website was supplied on registration', () => {
    expect(
      service.shouldIngest({
        website: 'https://example.com',
        description: 'Short description',
        product_or_service: 'Software',
        target_customers: 'Businesses',
        business_goals: 'Grow',
        current_challenges: '',
      } as any),
    ).toBe(true);
  });

  it('does not ingest without a website', () => {
    expect(service.shouldIngest({ website: '' } as any)).toBe(false);
    expect(
      service.shouldIngest({
        website: 'https://example.com',
        description: 'D'.repeat(350),
        product_or_service: 'P'.repeat(200),
        target_customers: 'T'.repeat(150),
        business_goals: 'G'.repeat(150),
        current_challenges: 'C'.repeat(100),
      } as any),
    ).toBe(true);
  });

  it('normalizes SPA fragments before sending a URL to Firecrawl', () => {
    const url = (service as any).validatePublicWebsite(
      'https://esewa.com.np/#/home',
    );
    expect(url.toString()).toBe('https://esewa.com.np/');
  });

  it('filters XML and authentication pages locally without Firecrawl regex globs', () => {
    expect(
      (service as any).shouldExcludePage('https://esewa.com.np/sitemap.xml'),
    ).toBe(true);
    expect(
      (service as any).shouldExcludePage('https://esewa.com.np/login'),
    ).toBe(true);
    expect(
      (service as any).shouldExcludePage('https://esewa.com.np/about-us'),
    ).toBe(false);
  });

  it('pins page formatting and the company overview to GPT OSS 120B', async () => {
    const llmService = {
      generateText: jest
        .fn()
        .mockResolvedValueOnce({
          content:
            '## Services\nSource: https://example.com/services\n- Service A',
          model: 'openai/gpt-oss-120b',
        })
        .mockResolvedValueOnce({
          content: '## Summary\n- Official company overview',
          model: 'openai/gpt-oss-120b',
        }),
    };
    const formattingService = new CompanyWebsiteIngestionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      llmService as any,
    );

    const result = await (formattingService as any).formatCompanyEvidence(
      {
        name: 'Example',
        website: 'https://example.com/#/home',
        known_competitors: [],
      },
      [
        {
          url: 'https://example.com/services',
          title: 'Services',
          description: 'Official services',
          markdown:
            'Service A helps business customers process transactions securely.',
        },
      ],
    );

    expect(llmService.generateText).toHaveBeenCalledTimes(2);
    for (const [options] of llmService.generateText.mock.calls) {
      expect(options.model).toBe('openai/gpt-oss-120b');
    }
    expect(result).toContain('# Company Overview');
    expect(result).toContain('# Detailed Official Website Evidence');
  });

  it('recovers from the reported crawl 400 using normalized rendered-page scraping', async () => {
    const firecrawl = {
      crawl: jest.fn().mockRejectedValue({
        status: 400,
        code: 'ERR_BAD_REQUEST',
        details: {
          error: 'Invalid regular expression: /*.xml/: Nothing to repeat',
        },
      }),
      scrapeUrl: jest.fn().mockResolvedValue({
        markdown:
          '# eSewa\nOfficial digital wallet services for customers and merchants across Nepal, including payments, transfers, merchant tools, and account services.\n[About](/about-us)',
        links: ['https://esewa.com.np/about-us'],
        metadata: {
          sourceURL: 'https://esewa.com.np/',
          title: 'eSewa',
        },
      }),
      map: jest.fn().mockResolvedValue({
        links: [
          {
            url: 'https://esewa.com.np/about-us',
            title: 'About eSewa',
          },
        ],
      }),
    };
    const crawlService = new CompanyWebsiteIngestionService(
      {} as any,
      {
        get: jest.fn((key: string) =>
          key === 'FIRECRAWL_API_KEY' ? 'test-key' : undefined,
        ),
      } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest
      .spyOn(crawlService as any, 'createFirecrawlClient')
      .mockReturnValue(firecrawl);

    const pages = await (crawlService as any).crawlOfficialWebsite(
      'https://esewa.com.np/#/home',
    );

    expect(firecrawl.crawl).toHaveBeenCalledWith(
      'https://esewa.com.np/',
      expect.not.objectContaining({ excludePaths: expect.anything() }),
    );
    expect(firecrawl.scrapeUrl).toHaveBeenCalledWith(
      'https://esewa.com.np/',
      expect.objectContaining({
        formats: ['markdown'],
        blockAds: true,
        waitFor: 2500,
      }),
    );
    expect(pages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://esewa.com.np/' }),
      ]),
    );
  });
});
