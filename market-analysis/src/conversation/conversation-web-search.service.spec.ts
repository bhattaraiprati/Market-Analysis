import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
import { ConversationWebSearchService } from './conversation-web-search.service';

describe('ConversationWebSearchService relevance filtering', () => {
  const llmService = {
    generateText: jest.fn(),
  } as unknown as LlmService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'Firecrawl_API_KEY') return 'test-key';
      if (key === 'FIRECRAWL_MIN_INTERVAL_MS') return '1';
      return undefined;
    }),
  } as unknown as ConfigService;

  let service: ConversationWebSearchService;
  let search: jest.Mock;
  let scrapeUrl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConversationWebSearchService(configService, llmService);
    search = jest.fn();
    scrapeUrl = jest.fn();
    (
      service as unknown as {
        firecrawl: { search: jest.Mock; scrapeUrl: jest.Mock };
      }
    ).firecrawl = { search, scrapeUrl };
  });

  it('ranks relevant result pages and never replaces them with generic site roots', async () => {
    (llmService.generateText as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        queries: [
          'eSewa digital wallet competitors Nepal 2024',
          'Nepal Rastra Bank licensed payment service providers 2024',
          'Nepal digital wallet market share eSewa Khalti IME Pay 2024',
        ],
        location: 'Nepal',
      }),
      model: 'test-search-model',
    });

    search.mockResolvedValue({
      web: [
        {
          url: 'https://www.reddit.com/r/Nepal/comments/example/esewa_competitors/',
          title: 'What are the main eSewa competitors in Nepal?',
          description: 'Community discussion about digital wallets.',
        },
        {
          url: 'https://www.cbinsights.com/',
          title: 'Technology market intelligence platform',
          description: 'Research private companies and technology markets.',
        },
        {
          url: 'https://www.similarweb.com/',
          title: 'Website traffic checker',
          description: 'Analyze website traffic and competitors.',
        },
        {
          url: 'https://www.gadgetbytenepal.com/best-digital-wallets-nepal/',
          title: 'Top 5 Digital Wallets in Nepal 2024',
          description:
            'A comparison of eSewa, Khalti, IME Pay and other wallets.',
        },
        {
          url: 'https://www.nrb.org.np/psd/licensed-payment-service-providers/',
          title: 'Licensed Payment Service Providers in Nepal 2024',
          description:
            'The official Nepal Rastra Bank list of wallet providers.',
        },
        {
          url: 'https://www.techpana.com/2024/esewa-khalti-ime-pay-nepal',
          title: 'eSewa, Khalti and IME Pay compete in Nepal',
          description: 'Nepal digital wallet market comparison for 2024.',
        },
        {
          url: 'https://payatlas.com/',
          title: 'Global payment methods',
          description: 'A worldwide payment directory.',
        },
      ],
    });
    scrapeUrl.mockImplementation((url: string) =>
      Promise.resolve({
        markdown:
          'Nepal digital wallet market evidence covering eSewa, Khalti, IME Pay and licensed payment service providers in 2024.',
        metadata: {
          title: `Evidence for ${url}`,
          description: 'eSewa digital wallet competitors in Nepal in 2024.',
          sourceURL: url,
        },
      }),
    );

    const result = await service.research({
      userQuery: 'top 5 digital wallet competitors of eSewa in Nepal 2024',
      optimizedQuery: 'eSewa competitors Nepal digital wallets 2024',
      companyContext:
        '# COMPANY PROFILE\nCompany Name: eSewa\nLocation: Kathmandu, Nepal',
      persona: { primary_focus_role: 'MARKET_RESEARCHER' },
    });

    expect(result.sites).toEqual(
      expect.arrayContaining([
        'https://www.gadgetbytenepal.com',
        'https://www.nrb.org.np',
        'https://www.techpana.com',
      ]),
    );
    expect(result.sites).not.toEqual(
      expect.arrayContaining([
        'https://www.reddit.com',
        'https://www.cbinsights.com',
        'https://www.similarweb.com',
        'https://payatlas.com',
      ]),
    );

    const scrapedUrls = (
      scrapeUrl.mock.calls as unknown as Array<[string]>
    ).map(([url]) => url);
    expect(scrapedUrls).toContain(
      'https://www.gadgetbytenepal.com/best-digital-wallets-nepal',
    );
    expect(scrapedUrls).toContain(
      'https://www.nrb.org.np/psd/licensed-payment-service-providers',
    );
    expect(scrapedUrls).not.toContain('https://www.gadgetbytenepal.com');
    expect(scrapedUrls).not.toContain('https://www.reddit.com');

    const searchOptions = (
      search.mock.calls as unknown as Array<
        [string, { location?: string; tbs?: string; excludeDomains?: string[] }]
      >
    )[0][1];
    expect(searchOptions.location).toBe('Nepal');
    expect(searchOptions.tbs).toBe('cdr:1,cd_min:01/01/2024,cd_max:12/31/2024');
    expect(searchOptions.excludeDomains).toContain('reddit.com');
  });

  it('discards a selected page when its scraped content is unrelated', async () => {
    (llmService.generateText as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        queries: [
          'eSewa digital wallet competitors Nepal',
          'Nepal payment service providers',
          'eSewa market competitors',
        ],
        location: 'Nepal',
      }),
      model: 'test-search-model',
    });
    search.mockResolvedValue({
      web: [
        {
          url: 'https://example.com/esewa-digital-wallet-competitors-nepal',
          title: 'eSewa digital wallet competitors in Nepal',
          description: 'A purported market comparison.',
        },
      ],
    });
    scrapeUrl.mockResolvedValue({
      markdown: 'This page is a generic international software directory.',
      metadata: {
        title: 'International software directory',
        description: 'Browse unrelated enterprise software categories.',
        sourceURL: 'https://example.com/',
      },
    });

    const result = await service.research({
      userQuery: 'eSewa digital wallet competitors in Nepal',
    });

    expect(result.sites).toEqual([]);
    expect(result.results).toEqual([]);
  });
});
