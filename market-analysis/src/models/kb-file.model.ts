import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { KnowledgeBase } from './knowledge-base.model';

export enum FileProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ChunkStrategy {
  SLIDING_WINDOW = 'sliding_window',
  SENTENCE = 'sentence',
  PARAGRAPH = 'paragraph',
  SEMANTIC = 'semantic',
}

@Table({
  tableName: 'kb_files',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
})
export class KBFile extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => KnowledgeBase)
  @Column({ type: DataType.UUID, allowNull: false })
  declare knowledge_base_id: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  declare original_filename: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  declare file_type: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare file_size_bytes: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare mime_type: string;

  // Storage
  @Column({ type: DataType.STRING(1000), allowNull: false })
  declare storage_path: string;

  @Default('cloudinary')
  @Column({ type: DataType.STRING(50), allowNull: false })
  declare storage_provider: string;

  @Column({ type: DataType.STRING(1000), allowNull: true })
  declare storage_url: string;

  // Processing
  @Default(FileProcessingStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(FileProcessingStatus)),
    allowNull: false,
  })
  declare processing_status: FileProcessingStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare processing_error: string;

  @Column({ type: DataType.DATE, allowNull: true })
  declare processed_at: Date;

  // Extraction results
  @Column({ type: DataType.TEXT, allowNull: true })
  declare extracted_text: string;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare extracted_metadata: Record<string, any>;

  // Chunking
  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare chunk_count: number;

  @Default(ChunkStrategy.SLIDING_WINDOW)
  @Column({
    type: DataType.ENUM(...Object.values(ChunkStrategy)),
    allowNull: false,
  })
  declare chunk_strategy: ChunkStrategy;

  @Default(512)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare chunk_size: number;

  @Default(50)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare chunk_overlap: number;

  // Indexing
  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare indexed: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  declare indexed_at: Date;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare metadata: Record<string, any>;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare uploaded_at: Date;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // Associations
  @BelongsTo(() => KnowledgeBase)
  declare knowledgeBase: KnowledgeBase;
}
