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
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import 'multer';
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
   * Upload files to a knowledge base
   * Supports: PDF, DOCX, TXT
   */
  @Post(':id/files')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files at once
  @HttpCode(HttpStatus.CREATED)
  async uploadFiles(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB per file
          new FileTypeValidator({
            fileType: /(pdf|docx?|txt|text\/plain|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    const uploadedFiles = await this.knowledgeBaseService.uploadFiles(
      id,
      files,
      user.organizationId,
    );

    return {
      success: true,
      message: `${files.length} file(s) uploaded and queued for processing`,
      data: uploadedFiles,
      info: 'Files are being processed in the background. Check the file status for processing updates.',
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
