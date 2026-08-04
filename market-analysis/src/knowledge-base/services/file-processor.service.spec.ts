import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { FileProcessorService } from './file-processor.service';

const extractedText =
  'A valid PDF document with enough words for text extraction testing.';

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({
      text: extractedText,
      total: 2,
      pages: [],
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('FileProcessorService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('extracts PDF text with the pdf-parse v2 API and releases the parser', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.7');
    const filePath = path.join(
      os.tmpdir(),
      `file-processor-${process.pid}-${Date.now()}.pdf`,
    );
    fs.writeFileSync(filePath, pdfBuffer);

    try {
      const service = new FileProcessorService();
      const result = await service.extractText(filePath, 'application/pdf');

      expect(PDFParse).toHaveBeenCalledWith({ data: pdfBuffer });
      expect(result).toEqual({
        text: extractedText,
        metadata: {
          pageCount: 2,
          wordCount: 11,
          charCount: extractedText.length,
          extractionMethod: 'pdf-parse',
        },
      });

      const parser = (PDFParse as unknown as jest.Mock).mock.results[0].value;
      expect(parser.getText).toHaveBeenCalledTimes(1);
      expect(parser.destroy).toHaveBeenCalledTimes(1);
    } finally {
      fs.rmSync(filePath, { force: true });
    }
  });
});
