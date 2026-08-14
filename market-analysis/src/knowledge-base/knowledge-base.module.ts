import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBase } from '../models/knowledge-base.model';
import { KBFile } from '../models/kb-file.model';
import { PineconeService } from './services/pinecone.service';
import { EmbeddingService } from './services/embedding.service';
import { FileProcessorService } from './services/file-processor.service';
import { CloudinaryService } from './services/cloudinary.service';
import { PdfDocumentService } from './services/pdf-document.service';

@Module({
  imports: [SequelizeModule.forFeature([KnowledgeBase, KBFile]), ConfigModule],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    PineconeService,
    EmbeddingService,
    FileProcessorService,
    CloudinaryService,
    PdfDocumentService,
  ],
  exports: [
    KnowledgeBaseService,
    PineconeService,
    EmbeddingService,
    PdfDocumentService,
  ],
})
export class KnowledgeBaseModule {}
