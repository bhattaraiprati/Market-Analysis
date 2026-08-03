import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface EmbeddingResponse {
  embeddings: number[][];
  usage: {
    total_tokens: number;
  };
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly jinaApiKey: string;
  private readonly jinaApiUrl = 'https://api.jina.ai/v1/embeddings';
  private readonly embeddingModel = 'jina-embeddings-v3'; // Jina's latest model
  private readonly embeddingDimension = 1024; // Jina v3 default dimension

  constructor(private configService: ConfigService) {
    this.jinaApiKey = this.configService.get<string>('JINA_API_KEY') ?? '';

    if (!this.jinaApiKey) {
      this.logger.warn('JINA_API_KEY not configured');
    }
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.generateEmbeddings([text]);
      return response.embeddings[0];
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResponse> {
    try {
      if (!this.jinaApiKey) {
        throw new Error('JINA_API_KEY not configured');
      }

      // Clean and validate texts
      const cleanTexts = texts
        .map((text) => this.cleanText(text))
        .filter((text) => text.length > 0);

      if (cleanTexts.length === 0) {
        throw new Error('No valid text to embed');
      }

      this.logger.debug(`Generating embeddings for ${cleanTexts.length} texts`);

      const response = await axios.post(
        this.jinaApiUrl,
        {
          model: this.embeddingModel,
          input: cleanTexts,
          encoding_format: 'float',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.jinaApiKey}`,
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const embeddings = response.data.data.map((item: any) => item.embedding);
      const totalTokens = response.data.usage?.total_tokens || 0;

      this.logger.log(
        `Generated ${embeddings.length} embeddings (${totalTokens} tokens)`,
      );

      return {
        embeddings,
        usage: {
          total_tokens: totalTokens,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Jina API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw new Error(
          `Failed to generate embeddings: ${error.response?.data?.message || error.message}`,
        );
      }
      this.logger.error('Failed to generate embeddings', error);
      throw error;
    }
  }

  /**
   * Generate embeddings in batches to handle large datasets
   */
  async generateEmbeddingsBatch(
    texts: string[],
    batchSize: number = 32,
  ): Promise<number[][]> {
    try {
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        this.logger.debug(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`,
        );

        const response = await this.generateEmbeddings(batch);
        allEmbeddings.push(...response.embeddings);

        // Add small delay to avoid rate limiting
        if (i + batchSize < texts.length) {
          await this.sleep(100);
        }
      }

      this.logger.log(
        `Generated ${allEmbeddings.length} embeddings in ${Math.ceil(texts.length / batchSize)} batches`,
      );

      return allEmbeddings;
    } catch (error) {
      this.logger.error('Failed to generate embeddings in batches', error);
      throw error;
    }
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension(): number {
    return this.embeddingDimension;
  }

  /**
   * Clean text before embedding
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove control characters
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        // Trim
        .trim()
        // Limit length (Jina supports up to 8192 tokens, but we'll be conservative)
        .slice(0, 8000)
    );
  }

  /**
   * Utility function for adding delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }
}
