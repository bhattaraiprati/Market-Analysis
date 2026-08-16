import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

const DEFAULT_UPLOAD_TIMEOUT_MS = 180_000;
const DEFAULT_UPLOAD_MAX_ATTEMPTS = 3;
const DEFAULT_UPLOAD_RETRY_DELAY_MS = 1_000;

interface CloudinaryErrorLike {
  http_code?: number;
  message?: string;
  name?: string;
  code?: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly uploadTimeoutMs: number;
  private readonly uploadMaxAttempts: number;
  private readonly uploadRetryDelayMs: number;

  constructor(private configService: ConfigService) {
    this.uploadTimeoutMs = this.getPositiveInteger(
      'CLOUDINARY_UPLOAD_TIMEOUT_MS',
      DEFAULT_UPLOAD_TIMEOUT_MS,
    );
    this.uploadMaxAttempts = this.getPositiveInteger(
      'CLOUDINARY_UPLOAD_MAX_ATTEMPTS',
      DEFAULT_UPLOAD_MAX_ATTEMPTS,
    );
    this.uploadRetryDelayMs = this.getPositiveInteger(
      'CLOUDINARY_UPLOAD_RETRY_DELAY_MS',
      DEFAULT_UPLOAD_RETRY_DELAY_MS,
    );
    this.initializeCloudinary();
  }

  private initializeCloudinary() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary credentials not fully configured');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.logger.log('Cloudinary initialized successfully');
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadFile(
    filePath: string,
    options: {
      folder?: string;
      resourceType?: 'image' | 'raw' | 'video' | 'auto';
      publicId?: string;
      tags?: string[];
    } = {},
  ): Promise<UploadApiResponse> {
    try {
      const {
        folder = 'knowledge-base',
        resourceType = 'auto',
        publicId,
        tags = [],
      } = options;

      this.logger.log(`Uploading file to Cloudinary: ${filePath}`);

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        tags,
        use_filename: true,
        unique_filename: true,
      });

      this.logger.log(
        `File uploaded successfully: ${result.public_id} (${result.format})`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to upload file to Cloudinary', error);
      throw error;
    }
  }

  /**
   * Upload file buffer to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder?: string;
      resourceType?: 'image' | 'raw' | 'video' | 'auto';
      publicId?: string;
      tags?: string[];
      originalFilename?: string;
    } = {},
  ): Promise<UploadApiResponse> {
    const {
      folder = 'knowledge-base',
      resourceType = 'auto',
      publicId,
      tags = [],
      originalFilename,
    } = options;

    this.logger.log(
      `Uploading ${buffer.length} byte buffer to Cloudinary (timeout ${this.uploadTimeoutMs}ms)`,
    );

    for (let attempt = 1; attempt <= this.uploadMaxAttempts; attempt += 1) {
      try {
        const result = await this.uploadBufferOnce(buffer, {
          folder,
          resourceType,
          publicId,
          tags,
          originalFilename,
        });
        this.logger.log(`Buffer uploaded successfully: ${result.public_id}`);
        return result;
      } catch (error) {
        const canRetry =
          attempt < this.uploadMaxAttempts &&
          this.isRetryableUploadError(error);

        if (!canRetry) {
          this.logger.error('Failed to upload buffer to Cloudinary', error);
          throw error;
        }

        const delayMs = this.uploadRetryDelayMs * 2 ** (attempt - 1);
        this.logger.warn(
          `Cloudinary upload attempt ${attempt}/${this.uploadMaxAttempts} failed transiently; retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
      }
    }

    throw new Error('Cloudinary upload failed without returning an error');
  }

  private uploadBufferOnce(
    buffer: Buffer,
    options: {
      folder: string;
      resourceType: 'image' | 'raw' | 'video' | 'auto';
      publicId?: string;
      tags: string[];
      originalFilename?: string;
    },
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: options.resourceType,
          public_id: options.publicId,
          tags: options.tags,
          use_filename: false,
          unique_filename: false,
          // Retries reuse the same public ID, so an upload that completed just
          // before the client timed out can be safely confirmed/replaced.
          overwrite: true,
          filename_override: options.originalFilename,
          display_name: options.originalFilename,
          timeout: this.uploadTimeoutMs,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error('Cloudinary upload did not return a result'));
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(buffer);
    });
  }

  private isRetryableUploadError(error: unknown): boolean {
    const uploadError = error as CloudinaryErrorLike;
    const status = uploadError?.http_code;
    const details = `${uploadError?.name ?? ''} ${uploadError?.code ?? ''} ${uploadError?.message ?? ''}`;

    return (
      status === 408 ||
      status === 429 ||
      status === 499 ||
      Boolean(status && status >= 500) ||
      /TimeoutError|ETIMEDOUT|ECONNRESET|EPIPE|socket hang up/i.test(details)
    );
  }

  private getPositiveInteger(key: string, fallback: number): number {
    const configured = Number(this.configService.get<string>(key));
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : fallback;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'raw' | 'video' = 'raw',
  ): Promise<any> {
    try {
      this.logger.log(`Deleting file from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      this.logger.log(`File deleted successfully: ${publicId}`);

      return result;
    } catch (error) {
      this.logger.error('Failed to delete file from Cloudinary', error);
      throw error;
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(
    publicId: string,
    options: {
      resourceType?: 'image' | 'raw' | 'video';
      secure?: boolean;
    } = {},
  ): string {
    const { resourceType = 'raw', secure = true } = options;

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      secure,
    });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(
    publicId: string,
    resourceType: 'image' | 'raw' | 'video' = 'raw',
  ): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get file metadata from Cloudinary', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(
    folder: string,
    resourceType: 'image' | 'raw' | 'video' = 'raw',
  ): Promise<any> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        resource_type: resourceType,
        max_results: 500,
      });

      return result.resources;
    } catch (error) {
      this.logger.error('Failed to list files from Cloudinary', error);
      throw error;
    }
  }

  /**
   * Delete files by tag
   */
  async deleteFilesByTag(
    tag: string,
    resourceType: 'image' | 'raw' | 'video' = 'raw',
  ): Promise<any> {
    try {
      this.logger.log(`Deleting files with tag: ${tag}`);

      const result = await cloudinary.api.delete_resources_by_tag(tag, {
        resource_type: resourceType,
      });

      this.logger.log(
        `Deleted ${result.deleted?.length || 0} files with tag: ${tag}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to delete files by tag from Cloudinary', error);
      throw error;
    }
  }

  /**
   * Generate organization-specific folder path
   */
  getOrganizationFolder(organizationId: string, subfolder?: string): string {
    const basePath = `knowledge-base/${organizationId}`;
    return subfolder ? `${basePath}/${subfolder}` : basePath;
  }

  /**
   * Generate knowledge base specific folder path
   */
  getKnowledgeBaseFolder(
    organizationId: string,
    knowledgeBaseId: string,
  ): string {
    return `knowledge-base/${organizationId}/${knowledgeBaseId}`;
  }
}
