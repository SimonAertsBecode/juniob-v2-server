import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtPayload, Tokens } from '../common/types';
import {
  SignupDto,
  SignupRole,
  SigninDto,
  AuthResponseDto,
  AuthResult,
  ForgotPasswordDto,
  ResetPasswordDto,
  AcceptInvitationDto,
  VerifyEmailDto,
  VerifyEmailResponseDto,
} from './dto';
import { CreditTransactionType, UserRole } from '../../prisma/generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase();

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash the password
    const hashedPassword = await argon2.hash(dto.password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    if (dto.role === SignupRole.DEVELOPER) {
      return this.signupDeveloper(
        dto,
        email,
        hashedPassword,
        emailVerificationToken,
      );
    } else {
      return this.signupCompany(
        dto,
        email,
        hashedPassword,
        emailVerificationToken,
      );
    }
  }

  private async signupDeveloper(
    dto: SignupDto,
    email: string,
    hashedPassword: string,
    emailVerificationToken: string,
  ): Promise<AuthResult> {
    // Validate invitation token if provided (now from PipelineEntry)
    let pipelineEntry = null;
    if (dto.invitationToken) {
      pipelineEntry = await this.prisma.pipelineEntry.findUnique({
        where: { invitationToken: dto.invitationToken },
      });

      if (!pipelineEntry) {
        throw new BadRequestException('Invalid invitation token');
      }

      if (pipelineEntry.developerId !== null) {
        throw new BadRequestException('This invitation has already been used');
      }

      if (pipelineEntry.candidateEmail?.toLowerCase() !== email) {
        throw new BadRequestException(
          'Email does not match the invitation email',
        );
      }

      if (
        pipelineEntry.tokenExpiresAt &&
        pipelineEntry.tokenExpiresAt < new Date()
      ) {
        throw new BadRequestException('This invitation has expired');
      }
    }

    // Create user and developer in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          hashedPassword,
          role: UserRole.DEVELOPER,
          emailVerificationToken,
        },
      });

      const developer = await tx.developer.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      return { user, developer };
    });

    // Handle invitation acceptance (unified model)
    if (pipelineEntry) {
      // Update the pipeline entry with the developer ID
      await this.prisma.pipelineEntry.update({
        where: { id: pipelineEntry.id },
        data: {
          developerId: result.developer.id,
          stage: 'REGISTERING',
          invitationToken: null, // Clear the token
        },
      });
    }

    // Link any other pending pipeline entries for this email
    await this.prisma.pipelineEntry.updateMany({
      where: {
        candidateEmail: email,
        developerId: null,
        id: pipelineEntry ? { not: pipelineEntry.id } : undefined,
      },
      data: {
        developerId: result.developer.id,
        stage: 'REGISTERING',
        invitationToken: null,
      },
    });

    // Send verification email
    this.emailService
      .sendVerificationEmail(email, emailVerificationToken, 'developer')
      .catch((err) => console.error('Failed to send verification email:', err));

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      email,
      UserRole.DEVELOPER,
    );

    await this.updateRefreshTokenHash(result.user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: result.user.id,
      email,
      role: 'DEVELOPER',
      emailVerified: false,
      developerId: result.developer.id,
      firstName: result.developer.firstName,
      lastName: result.developer.lastName,
      assessmentStatus: result.developer.assessmentStatus,
    };
  }

  private async signupCompany(
    dto: SignupDto,
    email: string,
    hashedPassword: string,
    emailVerificationToken: string,
  ): Promise<AuthResult> {
    // Create user and company in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          hashedPassword,
          role: UserRole.COMPANY,
          emailVerificationToken,
        },
      });

      const company = await tx.company.create({
        data: {
          userId: user.id,
          name: dto.companyName!,
          creditBalance: 3,
        },
      });

      // Record initial credit transaction
      await tx.creditTransaction.create({
        data: {
          companyId: company.id,
          type: CreditTransactionType.INITIAL,
          amount: 3,
          balanceAfter: 3,
          description: 'Welcome bonus - 3 free credits',
        },
      });

      return { user, company };
    });

    // Send verification email
    this.emailService
      .sendVerificationEmail(email, emailVerificationToken, 'company')
      .catch((err) => console.error('Failed to send verification email:', err));

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      email,
      UserRole.COMPANY,
    );

    await this.updateRefreshTokenHash(result.user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: result.user.id,
      email,
      role: 'COMPANY',
      emailVerified: false,
      companyId: result.company.id,
      companyName: result.company.name,
      creditBalance: result.company.creditBalance,
    };
  }

  async signin(dto: SigninDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase();

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        developer: true,
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const passwordValid = await argon2.verify(
      user.hashedPassword,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, email, user.role);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    // Build response based on role
    const baseResponse = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: user.id,
      email: user.email,
      role: user.role as 'DEVELOPER' | 'COMPANY',
      emailVerified: user.emailVerified,
    };

    if (user.role === UserRole.DEVELOPER && user.developer) {
      return {
        ...baseResponse,
        developerId: user.developer.id,
        firstName: user.developer.firstName,
        lastName: user.developer.lastName,
        assessmentStatus: user.developer.assessmentStatus,
      };
    } else if (user.role === UserRole.COMPANY && user.company) {
      return {
        ...baseResponse,
        companyId: user.company.id,
        companyName: user.company.name,
        creditBalance: user.company.creditBalance,
      };
    }

    return baseResponse;
  }

  async logout(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const rtValid = await argon2.verify(user.hashedRefreshToken, refreshToken);

    if (!rtValid) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async getMe(userId: number): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        developer: true,
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const baseResponse: AuthResponseDto = {
      id: user.id,
      email: user.email,
      role: user.role as 'DEVELOPER' | 'COMPANY',
      emailVerified: user.emailVerified,
    };

    if (user.role === UserRole.DEVELOPER && user.developer) {
      return {
        ...baseResponse,
        developerId: user.developer.id,
        firstName: user.developer.firstName,
        lastName: user.developer.lastName,
        assessmentStatus: user.developer.assessmentStatus,
      };
    } else if (user.role === UserRole.COMPANY && user.company) {
      return {
        ...baseResponse,
        companyId: user.company.id,
        companyName: user.company.name,
        creditBalance: user.company.creditBalance,
      };
    }

    return baseResponse;
  }

  /**
   * Accept an invitation - creates account with password and logs in
   * Email is verified because clicking the invitation link proves ownership
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<AuthResult> {
    // Find and validate invitation (now from PipelineEntry)
    const pipelineEntry = await this.prisma.pipelineEntry.findUnique({
      where: { invitationToken: dto.token },
    });

    if (!pipelineEntry) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (pipelineEntry.developerId !== null) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (
      pipelineEntry.tokenExpiresAt &&
      pipelineEntry.tokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('This invitation has expired');
    }

    const email = pipelineEntry.candidateEmail!.toLowerCase();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in instead.',
      );
    }

    // Hash the password
    const hashedPassword = await argon2.hash(dto.password);

    // Create user and developer in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          hashedPassword,
          role: UserRole.DEVELOPER,
          emailVerified: true, // Clicking invitation link proves email ownership
        },
      });

      const developer = await tx.developer.create({
        data: {
          userId: user.id,
          // Name will be set later in profile
        },
      });

      // Update this pipeline entry with the developer ID
      await tx.pipelineEntry.update({
        where: { id: pipelineEntry.id },
        data: {
          developerId: developer.id,
          stage: 'REGISTERING',
          invitationToken: null, // Clear the token
        },
      });

      // Link any other pending pipeline entries for this email
      await tx.pipelineEntry.updateMany({
        where: {
          candidateEmail: email,
          developerId: null,
          id: { not: pipelineEntry.id },
        },
        data: {
          developerId: developer.id,
          stage: 'REGISTERING',
          invitationToken: null,
        },
      });

      return { user, developer };
    });

    // Generate tokens and log user in
    const tokens = await this.generateTokens(
      result.user.id,
      email,
      UserRole.DEVELOPER,
    );

    await this.updateRefreshTokenHash(result.user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: result.user.id,
      email,
      role: 'DEVELOPER',
      emailVerified: true,
      developerId: result.developer.id,
      firstName: result.developer.firstName,
      lastName: result.developer.lastName,
      assessmentStatus: result.developer.assessmentStatus,
    };
  }

  /**
   * Verify email - optionally with password for invited users
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return { message: 'Email already verified', requiresPassword: false };
    }

    // Check if user needs to set a password (invited users have empty password)
    const needsPassword = user.hashedPassword === '';

    if (needsPassword && !dto.password) {
      // Return info that password is required
      return {
        message: 'Password required to complete verification',
        requiresPassword: true,
      };
    }

    // Prepare update data
    const updateData: {
      emailVerified: boolean;
      emailVerificationToken: null;
      hashedPassword?: string;
    } = {
      emailVerified: true,
      emailVerificationToken: null,
    };

    // If password provided, hash and store it
    if (dto.password) {
      updateData.hashedPassword = await argon2.hash(dto.password);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return { message: 'Email verified successfully', requiresPassword: false };
  }

  async resendVerificationEmail(userId: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken },
    });

    const userType = user.role === UserRole.DEVELOPER ? 'developer' : 'company';
    await this.emailService.sendVerificationEmail(
      user.email,
      emailVerificationToken,
      userType,
    );

    return { message: 'Verification email sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success message to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent',
      };
    }

    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpiresAt,
      },
    });

    this.emailService
      .sendPasswordResetEmail(user.email, passwordResetToken)
      .catch((err) =>
        console.error('Failed to send password reset email:', err),
      );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        hashedRefreshToken: null, // Force re-login on all devices
      },
    });

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(
    userId: number,
    email: string,
    role: UserRole,
  ): Promise<Tokens> {
    let tableId;
    if (role === UserRole.COMPANY) {
      const companyTable = await this.prisma.company.findUnique({
        where: { userId },
      });

      if (companyTable) tableId = companyTable.id;
    } else if (role === UserRole.DEVELOPER) {
      const developerTable = await this.prisma.developer.findUnique({
        where: { userId },
      });

      if (developerTable) tableId = developerTable.id;
    }

    if (!tableId)
      throw new InternalServerErrorException(
        'Failed to fetch tableId in token generation',
      );

    const payload: JwtPayload = {
      sub: userId,
      tableId,
      email,
      role,
    };

    const accessExpirationSec =
      this.config.get<number>('JWT_ACCESS_EXPIRATION_SEC') || 15 * 60;
    const refreshExpirationSec =
      this.config.get<number>('JWT_REFRESH_EXPIRATION_SEC') || 7 * 24 * 60 * 60;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpirationSec,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpirationSec,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }
}
