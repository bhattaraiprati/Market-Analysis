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
} from 'sequelize-typescript';
import { Conversation } from './conversation.model';
import { User } from './user.model';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Table({
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Message extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Conversation)
  @Column({ type: DataType.UUID, allowNull: false })
  declare conversation_id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare user_id: string;

  // Message content
  @Column({
    type: DataType.ENUM(...Object.values(MessageRole)),
    allowNull: false,
  })
  declare role: MessageRole;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string;

  // Processing metadata
  @Default(MessageStatus.COMPLETED)
  @Column({
    type: DataType.ENUM(...Object.values(MessageStatus)),
    allowNull: false,
  })
  declare status: MessageStatus;

  // Intent analysis (from query router)
  @Column({ type: DataType.JSONB, allowNull: true })
  declare intent_analysis: {
    requiresWebSearch: boolean;
    requiresKnowledgeBase: boolean;
    searchQuery?: string;
    queryType: 'factual' | 'analytical' | 'conversational' | 'current_data';
    confidence: number;
  };

  // Data sources used
  @Column({ type: DataType.JSONB, allowNull: true })
  declare sources_used: {
    webSearch?: {
      used: boolean;
      queries: string[];
      resultsCount: number;
    };
    knowledgeBase?: {
      used: boolean;
      knowledgeBaseIds: string[];
      chunksRetrieved: number;
      relevanceScores: number[];
    };
  };

  // Token usage
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare prompt_tokens: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare completion_tokens: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare total_tokens: number;

  // Performance metrics
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare processing_time_ms: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare model_used: string;

  // Error handling
  @Column({ type: DataType.TEXT, allowNull: true })
  declare error_message: string;

  // Rating and feedback
  @Column({ type: DataType.DECIMAL(3, 2), allowNull: true })
  declare rating: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare feedback: string;

  @CreatedAt
  declare created_at: Date;

  // Associations
  @BelongsTo(() => Conversation)
  declare conversation: Conversation;

  @BelongsTo(() => User)
  declare user: User;
}
