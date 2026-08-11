import {
  BelongsTo,
  BelongsToMany,
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
import { KnowledgeBase } from './knowledge-base.model';
import { PersonaKnowledgeBase } from './persona-knowledge-base.model';
import { PersonaPermission } from './persona-permission.model';
import { Conversation } from './conversation.model';

export enum PersonaRole {
  COMPETITIVE_ANALYST = 'COMPETITIVE_ANALYST',
  MARKET_RESEARCHER = 'MARKET_RESEARCHER',
  CUSTOMER_SUCCESS_EXPERT = 'CUSTOMER_SUCCESS_EXPERT',
  BUSINESS_STRATEGIST = 'BUSINESS_STRATEGIST',
  GENERAL_ASSISTANT = 'GENERAL_ASSISTANT',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  PRODUCT = 'PRODUCT',
  ENGINEERING = 'ENGINEERING',
  FINANCE = 'FINANCE',
  OPERATIONS = 'OPERATIONS',
  HR = 'HR',
}

export enum PersonaStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum PersonaVisibility {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

@Table({
  tableName: 'personas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
})
export class Persona extends Model {
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

  // Basic info
  @Column({ type: DataType.STRING(255), allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string;

  // Role & configuration
  @Column({
    type: DataType.ENUM(...Object.values(PersonaRole)),
    allowNull: false,
  })
  declare primary_focus_role: PersonaRole;

  // Capabilities
  @Default(true)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare web_search_enabled: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare external_data_sources_enabled: boolean;

  // Model configuration
  @Default('claude-3-5-sonnet-20240620')
  @Column({ type: DataType.STRING(100), allowNull: false })
  declare model_name: string;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare model_parameters: Record<string, any>;

  // Status & visibility
  @Default(PersonaStatus.ACTIVE)
  @Column({
    type: DataType.ENUM(...Object.values(PersonaStatus)),
    allowNull: false,
  })
  declare status: PersonaStatus;

  @Default(PersonaVisibility.PRIVATE)
  @Column({
    type: DataType.ENUM(...Object.values(PersonaVisibility)),
    allowNull: false,
  })
  declare visibility: PersonaVisibility;

  // Sharing
  @Column({ type: DataType.STRING(255), allowNull: true, unique: true })
  declare public_link_token: string;

  @Column({ type: DataType.STRING(255), allowNull: true, unique: true })
  declare organization_link_token: string;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare public_link_enabled: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare organization_link_enabled: boolean;

  // Statistics
  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total_conversations: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total_messages: number;

  @Column({ type: DataType.DECIMAL(3, 2), allowNull: true })
  declare avg_rating: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_used_at: Date;

  // Metadata
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

  @BelongsToMany(() => KnowledgeBase, () => PersonaKnowledgeBase)
  declare knowledgeBases: KnowledgeBase[];

  @HasMany(() => PersonaKnowledgeBase)
  declare personaKnowledgeBases: PersonaKnowledgeBase[];

  @HasMany(() => PersonaPermission)
  declare permissions: PersonaPermission[];

  @HasMany(() => Conversation)
  declare conversations: Conversation[];
}
