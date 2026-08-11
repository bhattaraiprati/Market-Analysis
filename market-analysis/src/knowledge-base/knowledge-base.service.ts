import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { KnowledgeBase, KnowledgeBaseStatus } from '../models/knowledge-base.model';
import { KBFile, FileProcessingStatus } from '../models/kb-file.model';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { PineconeService } from './services/pinecone.service';
import { EmbeddingService } from './services/embedding.service';
import { FileProcessorService } from './services/file-processor.service';
import { CloudinaryService } from './services/cloudinary.service';
import 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectModel(KnowledgeBase)
    private knowledgeBaseModel: typeof KnowledgeBase,
    @InjectModel(KBFile)
    private kbFileModel: typeof KBFile,
    private pineconeService: PineconeService,
    private embeddingService: EmbeddingService,
    private fileProcessorService: FileProcessorService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create a new knowledge base
   */
  async create(
    createDto: CreateKnowledgeBaseDto,
    userId: string,
    organizationId: string,
  ): Promise<KnowledgeBase> {
    try {
      if (!organizationId) {
        throw new BadRequestException(
          'Organization is required to create a knowledge base',
        );
      }

      const knowledgeBase = await this.knowledgeBaseModel.create({
        ...createDto,
        created_by: userId,
        organization_id: organizationId,
        indexing_status: 'pending',
      });

      this.logger.log(
        `Knowledge base created: ${knowledgeBase.id} for organization ${organizationId}`,
      );

      return knowledgeBase;
    } catch (error) {
      this.logger.error('Failed to create knowledge base', error);
      throw error;
    }
  }

  /**
   * Get all knowledge bases for an organization
   */
  async findAll(organizationId: string): Promise<KnowledgeBase[]> {
    try {
      const knowledgeBases = await this.knowledgeBaseModel.findAll({
        where: { organization_id: organizationId },
        include: [
          {
            model: KBFile,
            as: 'files',
            attributes: [
              'id',
              'original_filename',
              'file_type',
              'file_size_bytes',
              'processing_status',
              'indexed',
              'uploaded_at',
            ],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      return knowledgeBases;
    } catch (error) {
      this.logger.error('Failed to fetch knowledge bases', error);
      throw error;
    }
  }

  /**
   * Get a single knowledge base by ID
   */
  async findOne(
    id: string,
    organizationId: string,
  ): Promise<KnowledgeBase> {
    try {
      const knowledgeBase = await this.knowledgeBaseModel.findOne({
        where: {
          id,
          organization_id: organizationId,
        },
        include: [
          {
            model: KBFile,
            as: 'files',
          },
        ],
      });

      if (!knowledgeBase) {
        throw new NotFoundException(
          `Knowledge base with ID ${id} not found`,
        );
      }

      return knowledgeBase;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to fetch knowledge base', error);
      throw error;
    }
  }

  /**
   * Update a knowledge base
   */
  async update(
    id: string,
    updateDto: UpdateKnowledgeBaseDto,
    organizationId: string,
  ): Promise<KnowledgeBase> {
    try {
      const knowledgeBase = await this.findOne(id, organizationId);

      await knowledgeBase.update(updateDto);

      this.logger.log(`Knowledge base updated: ${id}`);

      return knowledgeBase;
    } catch (error) {
      this.logger.error('Failed to update knowledge base', error);
      throw error;
    }
  }

  /**
   * Delete a knowledge base (soft delete)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    try {
      const knowledgeBase = await this.findOne(id, organizationId);

      // Delete vectors from Pinecone
      await this.pineconeService.deleteVectorsByKnowledgeBase(
        organizationId,
        id,
      );

      // Delete files from Cloudinary
      const files = await this.kbFileModel.findAll({
        where: { knowledge_base_id: id },
      });

      for (const file of files) {
        try {
          // Extract public_id from storage_path
          const publicId = this.extractPublicIdFromPath(file.storage_path);
          if (publicId) {
            await this.cloudinaryService.deleteFile(publicId, 'raw');
          }
        } catch (error) {
          this.logger.warn(
            `Failed to delete file ${file.id} from Cloudinary`,
            error,
          );
        }
      }

      // Soft delete the knowledge base (and cascade to files due to paranoid)
      await knowledgeBase.destroy();

      this.logger.log(`Knowledge base deleted: ${id}`);
    } catch (error) {
      this.logger.error('Failed to delete knowledge base', error);
      throw error;
    }
  }

  /**
   * Upload and process one file for a knowledge base
   */
  async uploadFile(
    knowledgeBaseId: string,
    file: Express.Multer.File,
    organizationId: string,
  ): Promise<KBFile> {
    try {
      // Verify knowledge base exists and belongs to organization
      const knowledgeBase = await this.findOne(
        knowledgeBaseId,
        organizationId,
      );

      const folder = this.cloudinaryService.getKnowledgeBaseFolder(
        organizationId,
        knowledgeBaseId,
      );
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName =
        path
          .basename(file.originalname, extension)
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'document';
      const publicId = `${uuidv4()}_${baseName}${extension}`;

      // A raw upload stores the exact document bytes. Keeping the extension in
      // the public ID also makes the Cloudinary delivery URL downloadable and
      // readable as the original document type.
      const cloudinaryResult = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        {
          folder,
          resourceType: 'raw',
          publicId,
          tags: [organizationId, knowledgeBaseId, 'knowledge-base'],
          originalFilename: file.originalname,
        },
      );

      const kbFile = await this.kbFileModel.create({
        knowledge_base_id: knowledgeBaseId,
        original_filename: file.originalname,
        file_type: extension,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        storage_path: cloudinaryResult.public_id,
        storage_url: cloudinaryResult.secure_url,
        storage_provider: 'cloudinary',
        processing_status: FileProcessingStatus.PENDING,
      });

      this.logger.log(`File uploaded: ${file.originalname} (${kbFile.id})`);

      void this.processFileAsync(
        kbFile.id,
        knowledgeBaseId,
        organizationId,
        cloudinaryResult.secure_url,
        file.mimetype,
      );

      // Update knowledge base status
      await knowledgeBase.update({
        status: KnowledgeBaseStatus.PROCESSING,
        total_documents: knowledgeBase.total_documents + 1,
      });

      return kbFile;
    } catch (error) {
      this.logger.error(`Failed to upload file ${file.originalname}`, error);
      throw error;
    }
  }

  /**
   * Process file asynchronously (extract, chunk, embed, store)
   */
  private async processFileAsync(
    fileId: string,
    knowledgeBaseId: string,
    organizationId: string,
    fileUrl: string,
    mimeType: string,
  ): Promise<void> {
    try {
      const kbFile = await this.kbFileModel.findByPk(fileId);
      if (!kbFile) {
        throw new NotFoundException(`File ${fileId} not found`);
      }

      // Update status to processing
      await kbFile.update({ processing_status: FileProcessingStatus.PROCESSING });

      // Download file temporarily
      const tempFilePath = await this.downloadFile(fileUrl, fileId);

      try {
        console.log(`trying Processing file: ${fileId} at ${tempFilePath}`);
        // Extract text
        this.logger.log(`Extracting text from file: ${fileId}`);
        const extracted = await this.fileProcessorService.extractText(
          tempFilePath,
          mimeType,
        );

        // Clean text
        const cleanedText = this.fileProcessorService.cleanText(extracted.text);

        // Validate text
        if (!this.fileProcessorService.isValidText(cleanedText)) {
          throw new Error('Extracted text is invalid or too short');
        }

        // Update file with extracted text
        await kbFile.update({
          extracted_text: cleanedText.substring(0, 10000), // Store first 10k chars in DB
          extracted_metadata: extracted.metadata,
        });

        // Chunk text
        this.logger.log(`Chunking text from file: ${fileId}`);
        const chunks = this.fileProcessorService.chunkText(
          cleanedText,
          512,
          50,
        );

        if (chunks.length === 0) {
          throw new Error('No chunks generated from text');
        }

        // Generate embeddings
        this.logger.log(
          `Generating embeddings for ${chunks.length} chunks`,
        );
        const chunkTexts = chunks.map((chunk) => chunk.text);
        const embeddings = await this.embeddingService.generateEmbeddingsBatch(
          chunkTexts,
          32,
        );

        // Prepare vectors for Pinecone
        const vectors = embeddings.map((embedding, index) => ({
          id: `${fileId}_chunk_${index}`,
          values: embedding,
          metadata: {
            organization_id: organizationId,
            knowledge_base_id: knowledgeBaseId,
            file_id: fileId,
            chunk_index: index,
            original_text: chunks[index].text,
            file_name: kbFile.original_filename,
            file_type: kbFile.file_type,
            source_type: 'file' as const,
            timestamp: new Date().toISOString(),
          },
        }));

        // Upsert to Pinecone with organization namespace for isolation
        this.logger.log(`Upserting ${vectors.length} vectors to Pinecone`);
        await this.pineconeService.upsertVectors(vectors, organizationId);

        // Update file status
        await kbFile.update({
          processing_status: FileProcessingStatus.COMPLETED,
          processed_at: new Date(),
          chunk_count: chunks.length,
          indexed: true,
          indexed_at: new Date(),
        });

        // Update knowledge base stats
        const knowledgeBase = await this.knowledgeBaseModel.findByPk(
          knowledgeBaseId,
        );
        if (knowledgeBase) {
          await knowledgeBase.update({
            total_chunks: knowledgeBase.total_chunks + chunks.length,
            indexed_at: new Date(),
            indexing_status: 'completed',
          });
        }

        this.logger.log(
          `File processed successfully: ${fileId} (${chunks.length} chunks)`,
        );
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to process file ${fileId}`, error);

      // Update file status to failed
      await this.kbFileModel.update(
        {
          processing_status: FileProcessingStatus.FAILED,
          processing_error: error?.message ?? String(error),
        },
        { where: { id: fileId } },
      );
    }
  }

  /**
   * Query knowledge bases using vector search
   */
  async query(
    query: string,
    organizationId: string,
    options: {
      knowledgeBaseIds?: string[];
      topK?: number;
      minScore?: number;
    } = {},
  ) {
    try {
      const { knowledgeBaseIds, topK = 10, minScore = 0.7 } = options;

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Query Pinecone with organization isolation
      const results = await this.pineconeService.queryVectors(
        queryEmbedding,
        organizationId,
        {
          topK,
          knowledgeBaseIds,
          minScore,
          namespace: organizationId, // Use organization ID as namespace for isolation
          includeMetadata: true,
        },
      );

      return results;
    } catch (error) {
      this.logger.error('Failed to query knowledge bases', error);
      throw error;
    }
  }

  /**
   * Get file statistics for a knowledge base
   */
  async getFileStatistics(
    knowledgeBaseId: string,
    organizationId: string,
  ) {
    try {
      await this.findOne(knowledgeBaseId, organizationId);

      const files = await this.kbFileModel.findAll({
        where: { knowledge_base_id: knowledgeBaseId },
        attributes: [
          'processing_status',
          [
            this.kbFileModel.sequelize!.fn('COUNT', '*'),
            'count',
          ],
        ],
        group: ['processing_status'],
        raw: true,
      });

      return files;
    } catch (error) {
      this.logger.error('Failed to get file statistics', error);
      throw error;
    }
  }

  /**
   * Helper: Download file from URL to temp location
   */
  private async downloadFile(url: string, fileId: string): Promise<string> {
    const axios = require('axios');
    const tempDir = path.join(process.cwd(), 'temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${fileId}_temp`);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(tempFilePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempFilePath));
      writer.on('error', reject);
    });
  }

  /**
   * Helper: Extract Cloudinary public_id from storage path
   */
  private extractPublicIdFromPath(storagePath: string): string | null {
    // Raw Cloudinary assets keep their extension in the public ID.
    return storagePath;
  }

  /**
   * Delete a specific file from knowledge base
   */
  async deleteFile(
    fileId: string,
    knowledgeBaseId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const kbFile = await this.kbFileModel.findOne({
        where: {
          id: fileId,
          knowledge_base_id: knowledgeBaseId,
        },
      });

      if (!kbFile) {
        throw new NotFoundException(`File ${fileId} not found`);
      }

      // Verify organization ownership
      const kb = await this.findOne(knowledgeBaseId, organizationId);

      // Delete vectors from Pinecone
      await this.pineconeService.deleteVectorsByFile(
        organizationId,
        fileId,
        organizationId,
      );

      // Delete from Cloudinary
      const publicId = this.extractPublicIdFromPath(kbFile.storage_path);
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId, 'raw');
      }

      // Delete file record
      await kbFile.destroy();

      // Update knowledge base stats
      await kb.update({
        total_documents: Math.max(0, kb.total_documents - 1),
        total_chunks: Math.max(0, kb.total_chunks - kbFile.chunk_count),
      });

      this.logger.log(`File deleted: ${fileId}`);
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      throw error;
    }
  }
}
