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
import { User } from './user.model';
import { OrganizationMember } from './organizationMember.model';
import { OrganizationStatus } from '../common/enums';

@Table({
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Organization extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare owner_id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare industry: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare website: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare product_or_service: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare target_customers: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare business_goals: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare current_challenges: string;

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  declare known_competitors: string[];

  @Column({ type: DataType.STRING, allowNull: true })
  declare company_size: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare location: string;

  @Default(OrganizationStatus.PENDING_APPROVAL)
  @Column({
    type: DataType.ENUM(...Object.values(OrganizationStatus)),
    allowNull: false,
  })
  declare status: OrganizationStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare rejection_reason: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // ASSOCIATIONS
  @BelongsTo(() => User)
  declare owner: User;

  @HasMany(() => OrganizationMember)
  declare members: OrganizationMember[];

  @BelongsToMany(() => User, () => OrganizationMember)
  declare users: User[];
}
