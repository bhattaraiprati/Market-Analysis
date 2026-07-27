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
import { ResearchSource } from './research-source.model';

@Table({
  tableName: 'research_jobs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['organization_id'] }, { fields: ['status'] }],
})
export class ResearchJob extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organization_id: string;

  @Default('PENDING')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  declare status: string; // PENDING, IN_PROGRESS, COMPLETED, FAILED

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  declare research_type: string; // COMPETITOR, MARKET, CUSTOMER, COMPREHENSIVE

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare input_parameters: Record<string, any>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare agent_orchestration_state: Record<string, any>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare output_results: Record<string, any>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare completed_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare analyzed_at: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare error_message: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // ASSOCIATIONS
  @BelongsTo(() => Organization)
  declare organization: Organization;

  @HasMany(() => ResearchSource)
  declare sources: ResearchSource[];
}
