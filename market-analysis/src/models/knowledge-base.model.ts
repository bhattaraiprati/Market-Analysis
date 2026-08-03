import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Organization } from './organization.model';
import { User } from './user.model';
import { KBFile } from './kb-file.model';

export enum KnowledgeBaseStatus {
  ACTIVE = 'active',
  PROCESSING = 'processing',
  ERROR = 'error',
  ARCHIVED = 'archived',
}

export enum KnowledgeBaseType {
  FILE_UPLOAD = 'file_upload',
  DATABASE = 'database',
  API = 'api',
  HYBRID = 'hybrid',
}

export enum KnowledgeBaseVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
  ORGANIZATION = 'organization',
}

@Table({
  tableName: 'knowledge_bases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true, // soft delete support
  deletedAt: 'deleted_at',
})
export class KnowledgeBase extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organization_id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare created_by: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare category: string;

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true, defaultValue: [] })
  declare tags: string[];

  @Default(KnowledgeBaseType.FILE_UPLOAD)
  @Column({
    type: DataType.ENUM(...Object.values(KnowledgeBaseType)),
    allowNull: false,
  })
  declare type: KnowledgeBaseType;

  @Default(KnowledgeBaseStatus.ACTIVE)
  @Column({
    type: DataType.ENUM(...Object.values(KnowledgeBaseStatus)),
    allowNull: false,
  })
  declare status: KnowledgeBaseStatus;

  @Default(KnowledgeBaseVisibility.PRIVATE)
  @Column({
    type: DataType.ENUM(...Object.values(KnowledgeBaseVisibility)),
    allowNull: false,
  })
  declare visibility: KnowledgeBaseVisibility;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare source_config: Record<string, any>;

  // Indexing status
  @Default('pending')
  @Column({ type: DataType.STRING(50), allowNull: false })
  declare indexing_status: string;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total_documents: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total_chunks: number;

  @Default(0)
  @Column({ type: DataType.BIGINT, allowNull: false })
  declare total_tokens: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare indexed_at: Date;

  // Statistics
  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare usage_count: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_used_at: Date;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare metadata: Record<string, any>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // Associations
  @BelongsTo(() => Organization)
  declare organization: Organization;

  @BelongsTo(() => User, 'created_by')
  declare creator: User;

  @HasMany(() => KBFile)
  declare files: KBFile[];
}
