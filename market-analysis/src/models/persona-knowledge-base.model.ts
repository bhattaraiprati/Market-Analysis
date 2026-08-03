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
import { Persona } from './persona.model';
import { KnowledgeBase } from './knowledge-base.model';
import { User } from './user.model';

@Table({
  tableName: 'persona_knowledge_bases',
  timestamps: true,
  createdAt: 'assigned_at',
  updatedAt: false,
})
export class PersonaKnowledgeBase extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Persona)
  @Column({ type: DataType.UUID, allowNull: false })
  declare persona_id: string;

  @ForeignKey(() => KnowledgeBase)
  @Column({ type: DataType.UUID, allowNull: false })
  declare knowledge_base_id: string;

  // Priority & configuration
  @Default(1)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare priority: number;

  @Default(1.0)
  @Column({ type: DataType.DECIMAL(3, 2), allowNull: false })
  declare weight: number;

  // Retrieval settings
  @Default(10)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare max_chunks: number;

  @Default(0.7)
  @Column({ type: DataType.DECIMAL(3, 2), allowNull: false })
  declare min_similarity: number;

  // Status
  @Default(true)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare is_active: boolean;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare assigned_by: string;

  @CreatedAt
  declare assigned_at: Date;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare metadata: Record<string, any>;

  // Associations
  @BelongsTo(() => Persona)
  declare persona: Persona;

  @BelongsTo(() => KnowledgeBase)
  declare knowledgeBase: KnowledgeBase;

  @BelongsTo(() => User, 'assigned_by')
  declare assignedBy: User;
}
