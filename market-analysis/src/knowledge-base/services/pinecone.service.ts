import { Injectable, Logger } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { ConfigService } from '@nestjs/config';

export interface VectorMetadata {
  organization_id: string;
  knowledge_base_id: string;
  file_id: string;
  chunk_index: number;
  original_text: string;
  file_name: string;
  file_type: string;
  source_type: 'file' | 'database' | 'web' | 'api';
  timestamp: string;
  page_number?: number;
  [key: string]: any;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

@Injectable()
export class PineconeService {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone!: Pinecone;
  private indexName!: string;

  constructor(private configService: ConfigService) {
    this.initializePinecone();
  }

  private initializePinecone() {
    try {
      const apiKey = this.configService.get<string>('PINECONE_API_KEY');
      const indexName = this.configService.get<string>('PINECONE_INDEX_NAME');

      if (!apiKey || !indexName) {
        throw new Error('Pinecone API key or index name not configured');
      }

      this.indexName = indexName;
      this.pinecone = new Pinecone({
        apiKey,
      });

      this.logger.log(
        `Pinecone initialized successfully with index: ${this.indexName}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone', error);
      throw error;
    }
  }

  /**
   * Upsert vectors to Pinecone with organization isolation
   */
  async upsertVectors(
    vectors: VectorRecord[],
    namespace?: string,
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);

      // Upsert in batches of 100 (Pinecone recommendation)
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        await index.namespace(namespace || '').upsert({ records: batch });

        this.logger.log(
          `Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} vectors) to namespace: ${namespace || 'default'}`,
        );
      }

      this.logger.log(
        `Successfully upserted ${vectors.length} vectors to Pinecone`,
      );
    } catch (error) {
      this.logger.error('Failed to upsert vectors to Pinecone', error);
      throw error;
    }
  }

  /**
   * Query vectors with organization-level isolation
   * This is the KEY method for ensuring data isolation between organizations
   */
  async queryVectors(
    queryVector: number[],
    organizationId: string,
    options: {
      topK?: number;
      knowledgeBaseIds?: string[];
      minScore?: number;
      namespace?: string;
      includeMetadata?: boolean;
    } = {},
  ): Promise<QueryResult[]> {
    try {
      const {
        topK = 10,
        knowledgeBaseIds = [],
        minScore = 0.7,
        namespace = '',
        includeMetadata = true,
      } = options;

      const index = this.pinecone.index(this.indexName);

      // Build filter for organization isolation
      // This ensures users only get results from their organization
      const filter: any = {
        organization_id: { $eq: organizationId },
      };

      // Optionally filter by specific knowledge bases
      if (knowledgeBaseIds.length > 0) {
        filter.knowledge_base_id = { $in: knowledgeBaseIds };
      }

      this.logger.debug(
        `Querying Pinecone with filter: ${JSON.stringify(filter)}`,
      );

      const queryResponse = await index.namespace(namespace).query({
        vector: queryVector,
        topK,
        filter,
        includeMetadata,
      });

      // Filter by minimum score
      const results: QueryResult[] = queryResponse.matches
        .filter((match) => match.score !== undefined && match.score >= minScore)
        .map((match) => ({
          id: match.id,
          score: match.score!,
          metadata: match.metadata as VectorMetadata,
        }));

      this.logger.log(
        `Found ${results.length} matches for organization ${organizationId} (filtered from ${queryResponse.matches.length} total)`,
      );

      return results;
    } catch (error) {
      this.logger.error('Failed to query vectors from Pinecone', error);
      throw error;
    }
  }

  /**
   * Delete vectors by knowledge base ID
   */
  async deleteVectorsByKnowledgeBase(
    organizationId: string,
    knowledgeBaseId: string,
    namespace?: string,
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);

      // Delete all vectors matching the filter
      await index.namespace(namespace || '').deleteMany({
        filter: {
          organization_id: { $eq: organizationId },
          knowledge_base_id: { $eq: knowledgeBaseId },
        },
      });

      this.logger.log(
        `Deleted all vectors for knowledge base ${knowledgeBaseId} in organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to delete vectors from Pinecone', error);
      throw error;
    }
  }

  /**
   * Delete vectors by file ID
   */
  async deleteVectorsByFile(
    organizationId: string,
    fileId: string,
    namespace?: string,
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);

      await index.namespace(namespace || '').deleteMany({
        filter: {
          organization_id: { $eq: organizationId },
          file_id: { $eq: fileId },
        },
      });

      this.logger.log(
        `Deleted all vectors for file ${fileId} in organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to delete file vectors from Pinecone', error);
      throw error;
    }
  }

  /**
   * Delete all vectors for an organization (use with caution!)
   */
  async deleteVectorsByOrganization(
    organizationId: string,
    namespace?: string,
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);

      await index.namespace(namespace || '').deleteMany({
        filter: {
          organization_id: { $eq: organizationId },
        },
      });

      this.logger.log(`Deleted all vectors for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(
        'Failed to delete organization vectors from Pinecone',
        error,
      );
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();

      this.logger.log('Pinecone index statistics retrieved');
      return stats;
    } catch (error) {
      this.logger.error('Failed to get index statistics', error);
      throw error;
    }
  }

  /**
   * Check if vectors exist for a specific filter
   */
  async vectorsExist(
    organizationId: string,
    knowledgeBaseId?: string,
    namespace?: string,
  ): Promise<boolean> {
    try {
      const filter: any = { organization_id: { $eq: organizationId } };
      if (knowledgeBaseId) {
        filter.knowledge_base_id = { $eq: knowledgeBaseId };
      }

      const index = this.pinecone.index(this.indexName);

      // Query with a dummy vector to check if any results exist
      const dummyVector = new Array(768).fill(0); // Adjust dimension based on your embedding model

      const response = await index.namespace(namespace || '').query({
        vector: dummyVector,
        topK: 1,
        filter,
        includeMetadata: false,
      });

      return response.matches.length > 0;
    } catch (error) {
      this.logger.error('Failed to check vector existence', error);
      return false;
    }
  }
}
