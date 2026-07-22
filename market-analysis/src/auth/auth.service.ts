import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { OrganizationMember } from '../models/organizationMember.model';
import {
  OrganizationStatus,
  UserRole,
  UserStatus,
  OrgMemberRole,
  OrgMemberStatus,
} from '../common/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  iat?: number;
  exp?: number;
}

interface AuthTokenResponse {
  token: string;
  expiresIn: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Organization) private readonly organizationModel: typeof Organization,
    @InjectModel(OrganizationMember)
    private readonly organizationMemberModel: typeof OrganizationMember,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate JWT access token with proper payload structure
   */
  private generateAccessToken(user: User, organizationId: string | null): AuthTokenResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: organizationId || null,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '5h');
    const token = this.jwtService.sign(payload, {
      expiresIn: expiresIn as any,
      secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key-change-in-production'),
    });

    const expiresAt = Math.floor(Date.now() / 1000) + this.parseExpirationToSeconds(expiresIn);

    return {
      token,
      expiresIn,
      expiresAt,
    };
  }

  /**
   * Convert expiration string (e.g., '5h', '30m', '7d') to seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 18000; // Default 5 hours
    }
  }

  /**
   * Generate Gravatar URL from email
   */
  private generateGravatarUrl(email: string): string {
    const emailHash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${emailHash}?d=robohash`;
  }

  /**
   * User Registration (Signup)
   */
  async register(registerDto: RegisterDto): Promise<{ message: string; userId: string }> {
    const normalizedEmail = registerDto.email.toLowerCase().trim();

    // Check for existing user
    const existing = await this.userModel.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Determine role (first user becomes SUPER_ADMIN)
    const userCount = await this.userModel.count();
    const role = userCount === 0 ? UserRole.SUPER_ADMIN : UserRole.USER;

    // Hash password with secure rounds
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const profilePicture = this.generateGravatarUrl(normalizedEmail);

    // Create user (for MVP, we'll skip email verification and set user as active)
    const user = await this.userModel.create({
      name: registerDto.name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      profile_picture: profilePicture,
      is_verified: true, // Auto-verify for MVP
      verification_token: null,
      status: UserStatus.ACTIVE, // Auto-activate for MVP
    });

    return {
      message: 'User registered successfully. You can now log in.',
      userId: user.id,
    };
  }

  /**
   * User Login
   */
  async login(loginDto: LoginDto): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      profilePicture: string;
      organizationId: string | null;
      organizationName: string | null;
      organizationStatus: OrganizationStatus | null;
    };
    token: string;
    expiresIn: string;
    expiresAt: number;
    message: string;
  }> {
    const normalizedEmail = loginDto.email.toLowerCase().trim();

    // Fetch user with organizations
    const user = await this.userModel.findOne({
      where: { email: normalizedEmail },
      include: [
        {
          model: Organization,
          through: { attributes: [] },
        },
      ],
    });

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account is not active. Please contact support.');
    }

    // Check email verification
    if (!user.is_verified) {
      throw new ForbiddenException('Please verify your email before logging in.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get organization details
    const organization = user.organizations && user.organizations.length > 0 ? user.organizations[0] : null;
    const organizationId = organization?.id || null;
    const organizationName = organization?.name || null;
    const organizationStatus = organization?.status || null;

    // Generate JWT token
    const tokenData = this.generateAccessToken(user, organizationId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profile_picture,
        organizationId,
        organizationName,
        organizationStatus,
      },
      token: tokenData.token,
      expiresIn: tokenData.expiresIn,
      expiresAt: tokenData.expiresAt,
      message: 'Login successful',
    };
  }

  /**
   * Create Organization (Company Registration)
   */
  async createOrganization(
    userId: string,
    createOrgDto: CreateOrganizationDto,
  ): Promise<{
    message: string;
    organization: {
      id: string;
      name: string;
      status: OrganizationStatus;
    };
  }> {
    // Check if user exists
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an organization
    const existingMembership = await this.organizationMemberModel.findOne({
      where: { user_id: userId },
    });

    if (existingMembership) {
      throw new ConflictException('You are already part of an organization');
    }

    // Create organization
    const organization = await this.organizationModel.create({
      name: createOrgDto.name,
      description: createOrgDto.description,
      industry: createOrgDto.industry,
      website: createOrgDto.website,
      product_or_service: createOrgDto.product_or_service,
      target_customers: createOrgDto.target_customers,
      business_goals: createOrgDto.business_goals,
      current_challenges: createOrgDto.current_challenges,
      known_competitors: createOrgDto.known_competitors,
      company_size: createOrgDto.company_size,
      location: createOrgDto.location,
      status: OrganizationStatus.PENDING_APPROVAL,
    });

    // Add user as OWNER of the organization
    await this.organizationMemberModel.create({
      user_id: userId,
      organization_id: organization.id,
      role: OrgMemberRole.OWNER,
      status: OrgMemberStatus.ACTIVE,
    });

    return {
      message: 'Organization created successfully. Awaiting admin approval.',
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
    };
  }

  /**
   * Get current user profile with organization details
   */
  async getProfile(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profilePicture: string;
    isVerified: boolean;
    status: UserStatus;
    organization: {
      id: string;
      name: string;
      status: OrganizationStatus;
      industry: string;
      memberRole: OrgMemberRole;
    } | null;
  }> {
    const user = await this.userModel.findByPk(userId, {
      include: [
        {
          model: Organization,
          through: { attributes: ['role'] },
        },
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organization = user.organizations && user.organizations.length > 0 ? user.organizations[0] : null;

    let organizationData: {
      id: string;
      name: string;
      status: OrganizationStatus;
      industry: string;
      memberRole: OrgMemberRole;
    } | null = null;

    if (organization) {
      const membership = await this.organizationMemberModel.findOne({
        where: {
          user_id: userId,
          organization_id: organization.id,
        },
      });

      organizationData = {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        industry: organization.industry,
        memberRole: membership?.role || OrgMemberRole.MEMBER,
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profile_picture,
      isVerified: user.is_verified,
      status: user.status,
      organization: organizationData,
    };
  }
}
