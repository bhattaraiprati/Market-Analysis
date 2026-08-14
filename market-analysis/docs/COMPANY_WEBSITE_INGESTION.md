# Automatic Company Website Knowledge Base

When an organization is created with a public website, the API always starts a
background ingestion job. Completing the other organization form fields does not
suppress website ingestion. Registration waits for the processing knowledge-base
record to be initialized, but does not wait for crawling, LLM processing, PDF
generation, embeddings, or indexing.

## Flow

1. Create an organization-visible knowledge base named `<Company> Company Profile`.
2. Crawl up to `COMPANY_WEBSITE_CRAWL_LIMIT` pages on the official domain with
   Firecrawl. External domains, authentication pages, carts, and admin paths are
   excluded locally. Firecrawl path options use regular expressions rather than
   shell globs, so the service does not send glob patterns such as `*.xml`.
   Firecrawl's robots handling remains enabled.
3. Normalize browser-only fragments before crawling. For example,
   `https://esewa.com.np/#/home` is crawled as `https://esewa.com.np/` because URL
   fragments are not sent to the web server.
4. If a domain crawl fails or produces fewer than three usable pages, render the
   homepage, map/discover same-domain links, rank useful company pages, and scrape
   them with the same retry and rate-control pattern used by conversation search.
5. Remove markup and obvious navigation noise. The LLM processes bounded pieces
   of each page using a preservation-focused prompt. Website text is explicitly
   treated as untrusted data to prevent prompt injection.
6. Combine the formatted sections with their exact source URLs. Page formatting
   and the company overview are explicitly generated with `openai/gpt-oss-120b`.
7. Generate a PDF and upload it to the knowledge-base Cloudinary folder through
   the reusable `PdfDocumentService.createAndUpload()` method.
8. Create the normal `kb_files` record, chunk the formatted source text, generate
   embeddings, and write vectors to the organization's Pinecone namespace.

Every vector retains normal tenant/file metadata plus `document_kind`,
`company_name`, `company_website`, `company_industry`, `company_location`,
`source_urls`, and `generated_automatically`.

## Status and visibility

The knowledge base appears in existing knowledge-base APIs while processing.
Clients can inspect `indexing_status` and `metadata.ingestion_status`. The latter
moves through `crawling`, `formatting`, and `completed`, or becomes `failed` with
`metadata.ingestion_error`. The PDF URL appears on the file returned by the
knowledge-base details endpoint and in `metadata.pdf_url` after completion.

Set the crawl limit in `.env`:

```env
COMPANY_WEBSITE_CRAWL_LIMIT=75
```

The service caps this value at 200 pages to bound registration-triggered cost and
processing time.

The organization-registration response includes the initial state:

```json
{
  "websiteIngestion": {
    "status": "queued",
    "knowledgeBaseId": "..."
  }
}
```

For an organization registered before this integration was active, or to retry a
failed ingestion, call the authenticated endpoint:

```http
POST /auth/organization/company-profile
Authorization: Bearer <token>
```

It returns `queued`, `processing`, or `completed` and never creates a duplicate
company-profile knowledge base.
