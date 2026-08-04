import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';


export interface ProcessedFile {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    charCount: number;
    extractionMethod: string;
  };
}

export interface TextChunk {
  text: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
  };
}

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);

  /**
   * Extract text from various file types
   */
  async extractText(
    filePath: string,
    mimeType: string,
  ): Promise<ProcessedFile> {
    try {
      this.logger.log(`Extracting text from file: ${filePath}`);

      let result: ProcessedFile;

      // Check file extension as fallback
      const ext = path.extname(filePath).toLowerCase();

      if (mimeType.includes('pdf') || ext === '.pdf') {
        result = await this.extractFromPDF(filePath);
      } else if (
        mimeType.includes('document') ||
        mimeType.includes('word') ||
        ext === '.docx' ||
        ext === '.doc'
      ) {
        result = await this.extractFromDOCX(filePath);
      } else if (mimeType.includes('text') || ext === '.txt') {
        result = await this.extractFromText(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      this.logger.log(
        `Successfully extracted ${result.metadata.charCount} characters from ${path.basename(filePath)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to extract text from ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Extract text from PDF files using pdf-parse
   */
  private async extractFromPDF(filePath: string): Promise<ProcessedFile> {
    let parser: PDFParse | undefined;

    try {
      this.logger.log(`Extracting text from PDF: ${filePath}`);
      const dataBuffer = fs.readFileSync(filePath);

      // pdf-parse v2 uses a parser instance rather than the v1
      // `pdfParse(buffer)` function API.
      parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();

      const text = textResult.text;

      if (!text || text.trim().length === 0) {
        throw new Error(
          'PDF text extraction returned empty content. The file may be scanned/image-based.',
        );
      }

      const wordCount = this.countWords(text);

      this.logger.log(
        `Successfully extracted ${text.length} characters from PDF (${textResult.total} pages)`,
      );

      return {
        text,
        metadata: {
          pageCount: textResult.total,
          wordCount,
          charCount: text.length,
          extractionMethod: 'pdf-parse',
        },
      };
    } catch (error: any) {
      this.logger.error('PDF extraction failed', error);
      throw new Error(`Failed to extract PDF: ${error.message}`);
    } finally {
      await parser?.destroy();
    }
  }

  /**
   * Extract text from DOCX files using mammoth
   */
  private async extractFromDOCX(filePath: string): Promise<ProcessedFile> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });

      const text = result.value;
      const wordCount = this.countWords(text);

      return {
        text,
        metadata: {
          wordCount,
          charCount: text.length,
          extractionMethod: 'mammoth',
        },
      };
    } catch (error: any) {
      this.logger.error('DOCX extraction failed', error);
      throw new Error(`Failed to extract DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(filePath: string): Promise<ProcessedFile> {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const wordCount = this.countWords(text);

      return {
        text,
        metadata: {
          wordCount,
          charCount: text.length,
          extractionMethod: 'fs.readFile',
        },
      };
    } catch (error: any) {
      this.logger.error('Text file extraction failed', error);
      throw new Error(`Failed to extract text file: ${error.message}`);
    }
  }

  /**
   * Chunk text using sliding window approach
   */
  chunkText(
    text: string,
    chunkSize: number = 512,
    overlap: number = 50,
  ): TextChunk[] {
    try {
      const chunks: TextChunk[] = [];

      // Split text into words for better chunking
      const words = text.split(/\s+/).filter((word) => word.length > 0);

      if (words.length === 0) {
        return [];
      }

      let chunkIndex = 0;
      let startWordIndex = 0;

      while (startWordIndex < words.length) {
        // Get chunk of words
        const chunkWords = words.slice(
          startWordIndex,
          startWordIndex + chunkSize,
        );
        const chunkText = chunkWords.join(' ');

        // Calculate character positions (approximate)
        const startChar = words
          .slice(0, startWordIndex)
          .join(' ').length;
        const endChar = startChar + chunkText.length;

        chunks.push({
          text: chunkText,
          index: chunkIndex,
          metadata: {
            startChar,
            endChar,
            wordCount: chunkWords.length,
          },
        });

        chunkIndex++;

        // Move to next chunk with overlap
        startWordIndex += chunkSize - overlap;

        // Ensure we don't create tiny last chunks
        if (
          startWordIndex < words.length &&
          words.length - startWordIndex < overlap
        ) {
          break;
        }
      }

      this.logger.log(
        `Created ${chunks.length} chunks from ${words.length} words`,
      );

      return chunks;
    } catch (error) {
      this.logger.error('Failed to chunk text', error);
      throw error;
    }
  }

  /**
   * Chunk text by sentences (alternative strategy)
   */
  chunkBySentences(
    text: string,
    sentencesPerChunk: number = 5,
    overlap: number = 1,
  ): TextChunk[] {
    try {
      // Split into sentences (simple approach)
      const sentences = text
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const chunks: TextChunk[] = [];
      let chunkIndex = 0;

      for (let i = 0; i < sentences.length; i += sentencesPerChunk - overlap) {
        const chunkSentences = sentences.slice(i, i + sentencesPerChunk);
        const chunkText = chunkSentences.join('. ') + '.';

        chunks.push({
          text: chunkText,
          index: chunkIndex,
          metadata: {
            startChar: 0,
            endChar: chunkText.length,
            wordCount: this.countWords(chunkText),
          },
        });

        chunkIndex++;
      }

      this.logger.log(
        `Created ${chunks.length} sentence-based chunks from ${sentences.length} sentences`,
      );

      return chunks;
    } catch (error) {
      this.logger.error('Failed to chunk text by sentences', error);
      throw error;
    }
  }

  /**
   * Chunk text by paragraphs
   */
  chunkByParagraphs(text: string, maxParagraphsPerChunk: number = 3): TextChunk[] {
    try {
      // Split into paragraphs
      const paragraphs = text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const chunks: TextChunk[] = [];
      let chunkIndex = 0;

      for (
        let i = 0;
        i < paragraphs.length;
        i += maxParagraphsPerChunk
      ) {
        const chunkParagraphs = paragraphs.slice(
          i,
          i + maxParagraphsPerChunk,
        );
        const chunkText = chunkParagraphs.join('\n\n');

        chunks.push({
          text: chunkText,
          index: chunkIndex,
          metadata: {
            startChar: 0,
            endChar: chunkText.length,
            wordCount: this.countWords(chunkText),
          },
        });

        chunkIndex++;
      }

      this.logger.log(
        `Created ${chunks.length} paragraph-based chunks from ${paragraphs.length} paragraphs`,
      );

      return chunks;
    } catch (error) {
      this.logger.error('Failed to chunk text by paragraphs', error);
      throw error;
    }
  }

  /**
   * Get appropriate chunking strategy based on text characteristics
   */
  getOptimalChunkStrategy(text: string): 'sliding_window' | 'sentence' | 'paragraph' {
    const paragraphCount = text.split(/\n\n+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const wordCount = this.countWords(text);

    // If text has clear paragraph structure
    if (paragraphCount > 5 && wordCount / paragraphCount < 200) {
      return 'paragraph';
    }

    // If text has good sentence structure
    if (sentenceCount > 10 && wordCount / sentenceCount < 50) {
      return 'sentence';
    }

    // Default to sliding window
    return 'sliding_window';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Clean extracted text
   */
  cleanText(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove control characters
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        // Remove common artifacts from PDF extraction
        .replace(/ /g, '')
        // Normalize unicode
        .normalize('NFKC')
        // Trim
        .trim()
    );
  }

  /**
   * Get file statistics
   */
  getTextStatistics(text: string) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.length > 0);
    const paragraphs = text.split(/\n\n+/).filter((p) => p.length > 0);

    return {
      charCount: text.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence:
        sentences.length > 0 ? words.length / sentences.length : 0,
      avgCharsPerWord: words.length > 0 ? text.length / words.length : 0,
    };
  }

  /**
   * Validate if text is meaningful (not just whitespace or gibberish)
   */
  isValidText(text: string, minWords: number = 10): boolean {
    const wordCount = this.countWords(text);
    return wordCount >= minWords;
  }
}
