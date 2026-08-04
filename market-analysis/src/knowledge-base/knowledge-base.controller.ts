import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpStatus,
  HttpCode,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('knowledge-bases')
@UseGuards(JwtAuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  /**
   * Create a new knowledge base
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createKnowledgeBaseDto: CreateKnowledgeBaseDto,
    @CurrentUser() user: any,
  ) {
    const knowledgeBase = await this.knowledgeBaseService.create(
      createKnowledgeBaseDto,
      user.userId,
      user.organizationId,
    );

    return {
      success: true,
      message: 'Knowledge base created successfully',
      data: knowledgeBase,
    };
  }

  /**
   * Get all knowledge bases for the organization
   */
  @Get()
  async findAll(@CurrentUser() user: any) {
    const knowledgeBases = await this.knowledgeBaseService.findAll(
      user.organizationId,
    );

    return {
      success: true,
      message: 'Knowledge bases retrieved successfully',
      data: knowledgeBases,
      count: knowledgeBases.length,
    };
  }

  /**
   * Get a single knowledge base by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const knowledgeBase = await this.knowledgeBaseService.findOne(
      id,
      user.organizationId,
    );

    return {
      success: true,
      message: 'Knowledge base retrieved successfully',
      data: knowledgeBase,
    };
  }

  /**
   * Update a knowledge base
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
    @CurrentUser() user: any,
  ) {
    const knowledgeBase = await this.knowledgeBaseService.update(
      id,
      updateKnowledgeBaseDto,
      user.organizationId,
    );

    return {
      success: true,
      message: 'Knowledge base updated successfully',
      data: knowledgeBase,
    };
  }

  /**
   * Delete a knowledge base
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.knowledgeBaseService.remove(id, user.organizationId);

    return {
      success: true,
      message: 'Knowledge base deleted successfully',
    };
  }

  /**
   * Upload one file to a knowledge base
   * Supports: PDF, DOCX, TXT
   */
  @Post(':id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType:
              /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const uploadedFile = await this.knowledgeBaseService.uploadFile(
      id,
      file,
      user.organizationId,
    );

    return {
      success: true,
      message: 'File uploaded and queued for processing',
      data: uploadedFile,
      info: 'The file is being processed in the background. Check its status for processing updates.',
    };
  }

  /**
   * Query knowledge bases with semantic search
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(
    @Body('query') query: string,
    @Body('knowledge_base_ids') knowledgeBaseIds: string[],
    @Body('top_k') topK: number,
    @Body('min_score') minScore: number,
    @CurrentUser() user: any,
  ) {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        message: 'Query string is required',
      };
    }

    const results = await this.knowledgeBaseService.query(
      query,
      user.organizationId,
      {
        knowledgeBaseIds,
        topK: topK || 10,
        minScore: minScore || 0.7,
      },
    );

    return {
      success: true,
      message: 'Query executed successfully',
      data: results,
      count: results.length,
    };
  }

  /**
   * Get file statistics for a knowledge base
   */
  @Get(':id/statistics')
  async getStatistics(@Param('id') id: string, @CurrentUser() user: any) {
    const statistics = await this.knowledgeBaseService.getFileStatistics(
      id,
      user.organizationId,
    );

    return {
      success: true,
      message: 'Statistics retrieved successfully',
      data: statistics,
    };
  }

  /**
   * Delete a specific file from a knowledge base
   */
  @Delete(':id/files/:fileId')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    await this.knowledgeBaseService.deleteFile(
      fileId,
      id,
      user.organizationId,
    );

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}
