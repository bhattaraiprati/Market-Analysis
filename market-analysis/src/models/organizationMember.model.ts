
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
import { User } from './user.model';
import { Organization } from './organization.model';
import { OrgMemberRole, OrgMemberStatus } from '../common/enums';

@Table({
  tableName: 'organization_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['user_id', 'organization_id'] },
    { fields: ['organization_id'] },
    { fields: ['user_id'] },
  ],
})
export class OrganizationMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare user_id: string;

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organization_id: string;

  @Default(OrgMemberRole.MEMBER)
  @Column({ type: DataType.ENUM(...Object.values(OrgMemberRole)), allowNull: false })
  declare role: OrgMemberRole;

  @Default(OrgMemberStatus.ACTIVE)
  @Column({ type: DataType.ENUM(...Object.values(OrgMemberStatus)), allowNull: false })
  declare status: OrgMemberStatus;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // ASSOCIATIONS
  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => Organization)
  declare organization: Organization;
}
