import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
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
    try {
      const {
        folder = 'knowledge-base',
        resourceType = 'auto',
        publicId,
        tags = [],
        originalFilename,
      } = options;

      this.logger.log(`Uploading buffer to Cloudinary`);

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            public_id: publicId,
            tags,
            use_filename: true,
            unique_filename: true,
            original_filename: originalFilename,
          },
          (error, result) => {
            if (error) {
              this.logger.error('Failed to upload buffer to Cloudinary', error);
              reject(error);
            } else if (!result) {
              const uploadError = new Error('Cloudinary upload did not return a result');
              this.logger.error('Failed to upload buffer to Cloudinary', uploadError);
              reject(uploadError);
            } else {
              this.logger.log(
                `Buffer uploaded successfully: ${result.public_id}`,
              );
              resolve(result);
            }
          },
        );

        uploadStream.end(buffer);
      });
    } catch (error) {
      this.logger.error('Failed to upload buffer to Cloudinary', error);
      throw error;
    }
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

      this.logger.log(`Deleted ${result.deleted?.length || 0} files with tag: ${tag}`);

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
