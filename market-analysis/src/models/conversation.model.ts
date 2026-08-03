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
import { Persona } from './persona.model';
import { Message } from './message.model';

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Table({
  tableName: 'conversations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
})
export class Conversation extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organization_id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare user_id: string;

  @ForeignKey(() => Persona)
  @Column({ type: DataType.UUID, allowNull: false })
  declare persona_id: string;

  // Conversation metadata
  @Column({ type: DataType.STRING(255), allowNull: true })
  declare title: string;

  @Default(ConversationStatus.ACTIVE)
  @Column({
    type: DataType.ENUM(...Object.values(ConversationStatus)),
    allowNull: false,
  })
  declare status: ConversationStatus;

  // Statistics
  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total_messages: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare total_tokens: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_message_at: Date;

  // Tags for organization
  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true, defaultValue: [] })
  declare tags: string[];

  // Context window
  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare context_summary: Record<string, any>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // Associations
  @BelongsTo(() => Organization)
  declare organization: Organization;

  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => Persona)
  declare persona: Persona;

  @HasMany(() => Message)
  declare messages: Message[];
}
