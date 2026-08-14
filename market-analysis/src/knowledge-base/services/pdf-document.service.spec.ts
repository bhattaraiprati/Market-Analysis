import { PdfDocumentService } from './pdf-document.service';

describe('PdfDocumentService', () => {
  it('creates a PDF buffer, uploads it, and returns reusable file details', async () => {
    let uploadedBuffer: Buffer | undefined;
    const cloudinaryService = {
      getKnowledgeBaseFolder: jest.fn(() => 'knowledge-base/org-1/kb-1'),
      uploadBuffer: jest.fn(async (buffer: Buffer) => {
        uploadedBuffer = buffer;
        return {
          public_id: 'knowledge-base/org-1/kb-1/company_profile.pdf',
          secure_url: 'https://cloudinary.example/company_profile.pdf',
          bytes: buffer.length,
        };
      }),
    };
    const service = new PdfDocumentService(cloudinaryService as any);

    const result = await service.createAndUpload(
      '# Company Profile\n\nProducts and services\nDetailed official company information.',
      {
        organizationId: 'org-1',
        knowledgeBaseId: 'kb-1',
        filename: 'Company Profile',
      },
    );

    expect(uploadedBuffer?.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
    expect(uploadedBuffer?.toString('latin1')).toContain('xref');
    expect(result).toEqual(
      expect.objectContaining({
        filename: 'Company_Profile.pdf',
        mimeType: 'application/pdf',
        secureUrl: 'https://cloudinary.example/company_profile.pdf',
      }),
    );
  });
});
