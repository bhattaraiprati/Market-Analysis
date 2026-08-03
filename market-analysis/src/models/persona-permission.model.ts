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
import { Persona } from './persona.model';
import { User } from './user.model';
import { Organization } from './organization.model';

export enum AccessLevel {
  VIEWER = 'viewer',
  USER = 'user',
  CONTRIBUTOR = 'contributor',
  CO_OWNER = 'co-owner',
}

@Table({
  tableName: 'persona_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class PersonaPermission extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Persona)
  @Column({ type: DataType.UUID, allowNull: false })
  declare persona_id: string;

  // Grantee (user or role)
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare user_id: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare role: string;

  @ForeignKey(() => Organization)
  @Column({ type: DataType.UUID, allowNull: true })
  declare organization_id: string;

  // Access level
  @Column({
    type: DataType.ENUM(...Object.values(AccessLevel)),
    allowNull: false,
  })
  declare access_level: AccessLevel;

  // Permissions
  @Default(true)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare can_chat: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare can_view_config: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare can_edit_config: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare can_add_knowledge: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare can_share: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare can_delete: boolean;

  // Grant details
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare granted_by: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare granted_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare expires_at: Date;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare metadata: Record<string, any>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // Associations
  @BelongsTo(() => Persona)
  declare persona: Persona;

  @BelongsTo(() => User, 'user_id')
  declare user: User;

  @BelongsTo(() => User, 'granted_by')
  declare grantedBy: User;

  @BelongsTo(() => Organization)
  declare organization: Organization;
}
