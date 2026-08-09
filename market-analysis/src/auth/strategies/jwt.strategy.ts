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
import { UserStatus } from '../../common/enums';

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

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      organizationId: payload.organizationId,
    };
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
