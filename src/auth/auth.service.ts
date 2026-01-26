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
} from './dto';
import {
  InvitationStatus,
  CreditTransactionType,
  UserRole,
} from '../../prisma/generated/prisma';

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
    // Validate invitation token if provided
    let invitation = null;
    if (dto.invitationToken) {
      invitation = await this.prisma.invitation.findUnique({
        where: { token: dto.invitationToken },
      });

      if (!invitation) {
        throw new BadRequestException('Invalid invitation token');
      }

      if (invitation.status === InvitationStatus.EXPIRED) {
        throw new BadRequestException('This invitation has expired');
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new BadRequestException('This invitation has already been used');
      }

      if (invitation.candidateEmail.toLowerCase() !== email) {
        throw new BadRequestException(
          'Email does not match the invitation email',
        );
      }

      if (invitation.expiresAt < new Date()) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
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

    // Handle invitation acceptance
    if (invitation) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          developerId: result.developer.id,
        },
      });

      await this.prisma.pipelineEntry.create({
        data: {
          companyId: invitation.companyId,
          developerId: result.developer.id,
          stage: 'REGISTERING',
        },
      });
    } else {
      // Check for pending invitations and link them
      const pendingInvitations = await this.prisma.invitation.findMany({
        where: {
          candidateEmail: email,
          status: InvitationStatus.PENDING,
          developerId: null,
        },
      });

      for (const inv of pendingInvitations) {
        await this.prisma.invitation.update({
          where: { id: inv.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
            developerId: result.developer.id,
          },
        });

        await this.prisma.pipelineEntry.create({
          data: {
            companyId: inv.companyId,
            developerId: result.developer.id,
            stage: 'REGISTERING',
          },
        });
      }
    }

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

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
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
