import {
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';

import { Organization } from './organization.model';
import { OrganizationMember } from './organizationMember.model';
import { UserRole, UserStatus } from '../common/enums';

@Table({
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['email'] }],
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Unique
  @Column({ type: DataType.STRING, allowNull: false, validate: { isEmail: true } })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare password: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare profile_picture: string;

  @Default(UserRole.USER)
  @Column({ type: DataType.ENUM(...Object.values(UserRole)), allowNull: false })
  declare role: UserRole;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare is_verified: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  declare verification_token: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare reset_password_token: string;

  @Column({ type: DataType.DATE, allowNull: true })
  declare reset_token_expires_at: Date;

  @Default(UserStatus.ACTIVE)
  @Column({ type: DataType.ENUM(...Object.values(UserStatus)), allowNull: false })
  declare status: UserStatus;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // ASSOCIATIONS
  @HasMany(() => OrganizationMember)
  declare organizationMemberships: OrganizationMember[];

  @BelongsToMany(() => Organization, () => OrganizationMember)
  declare organizations: Organization[];
}