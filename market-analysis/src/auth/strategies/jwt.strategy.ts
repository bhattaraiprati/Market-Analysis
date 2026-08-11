import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';
import { OrganizationMember } from '../../models/organizationMember.model';
import { OrgMemberStatus, UserStatus } from '../../common/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @InjectModel(OrganizationMember)
    private readonly organizationMemberModel: typeof OrganizationMember,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'your-secret-key-change-in-production',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.findUserWithTransientRetry(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    const organizationId = await this.resolveOrganizationId(
      user.id,
      payload.organizationId,
    );

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      organizationId,
    };
  }

  /**
   * Resolve organization membership from the database instead of trusting a
   * potentially stale JWT claim. This also makes tokens issued before company
   * registration usable immediately after the organization is created.
   */
  private async resolveOrganizationId(
    userId: string,
    tokenOrganizationId: string | null,
  ): Promise<string | null> {
    if (tokenOrganizationId) {
      const [ownedOrganization, activeMembership] = await Promise.all([
        this.organizationModel.findOne({
          where: { id: tokenOrganizationId, owner_id: userId },
          attributes: ['id'],
        }),
        this.organizationMemberModel.findOne({
          where: {
            user_id: userId,
            organization_id: tokenOrganizationId,
            status: OrgMemberStatus.ACTIVE,
          },
          attributes: ['organization_id'],
        }),
      ]);

      if (ownedOrganization || activeMembership) return tokenOrganizationId;
    }

    const ownedOrganization = await this.organizationModel.findOne({
      where: { owner_id: userId },
      attributes: ['id'],
      order: [['created_at', 'ASC']],
    });
    if (ownedOrganization) return ownedOrganization.id;

    const activeMembership = await this.organizationMemberModel.findOne({
      where: { user_id: userId, status: OrgMemberStatus.ACTIVE },
      attributes: ['organization_id'],
      order: [['created_at', 'ASC']],
    });

    return activeMembership?.organization_id ?? null;
  }

  private async findUserWithTransientRetry(
    userId: string,
  ): Promise<User | null> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.userModel.findByPk(userId);
      } catch (error: unknown) {
        if (!this.isTransientDatabaseError(error) || attempt === maxAttempts) {
          if (this.isTransientDatabaseError(error)) {
            this.logger.error(
              `Database remained unavailable during JWT validation after ${maxAttempts} attempts`,
            );
            throw new ServiceUnavailableException(
              'Database connection is temporarily unavailable',
            );
          }
          throw error;
        }

        this.logger.warn(
          `Transient database connection error during JWT validation; retrying user lookup`,
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return null;
  }

  private isTransientDatabaseError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as {
      original?: { code?: string };
      parent?: { code?: string };
    };
    const code = candidate.original?.code || candidate.parent?.code;
    return [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EPIPE',
      '57P01',
    ].includes(code || '');
  }
}
