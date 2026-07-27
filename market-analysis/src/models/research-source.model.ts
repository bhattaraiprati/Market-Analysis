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
import { ResearchJob } from './research-job.model';

@Table({
  tableName: 'research_sources',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['research_job_id'] }, { fields: ['source_type'] }],
})
export class ResearchSource extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => ResearchJob)
  @Column({ type: DataType.UUID, allowNull: false })
  declare research_job_id: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  declare source_type: string; // WEBSITE, SOCIAL, NEWS, REVIEW, VIDEO, COMPETITOR

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare url: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare content: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare scraped_at: Date;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  declare credibility_score: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare metadata: Record<string, any>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // ASSOCIATIONS
  @BelongsTo(() => ResearchJob)
  declare researchJob: ResearchJob;
}
