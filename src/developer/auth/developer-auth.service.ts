import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { Tokens } from '../../common/types';
import {
  DeveloperSignupDto,
  DeveloperSigninDto,
  DeveloperAuthResponseDto,
  DeveloperAuthResult,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { InvitationStatus } from '../../../prisma/generated/prisma';

@Injectable()
export class DeveloperAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async signup(dto: DeveloperSignupDto): Promise<DeveloperAuthResult> {
    // Check if developer with this email already exists
    const existingDeveloper = await this.prisma.developer.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingDeveloper) {
      throw new ConflictException('An account with this email already exists');
    }

    // If invitation token provided, validate it
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

      // Check if invitation email matches signup email
      if (invitation.candidateEmail.toLowerCase() !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'Email does not match the invitation email',
        );
      }

      // Check if invitation has expired by date
      if (invitation.expiresAt < new Date()) {
        // Update status to expired
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw new BadRequestException('This invitation has expired');
      }
    }

    // Hash the password
    const hashedPassword = await argon2.hash(dto.password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create the developer
    const developer = await this.prisma.developer.create({
      data: {
        email: dto.email.toLowerCase(),
        hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerificationToken,
      },
    });

    // If invitation exists, mark it as accepted and link to developer
    if (invitation) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          id: developer.id,
        },
      });

      // Create pipeline entry for the inviting company
      await this.prisma.pipelineEntry.create({
        data: {
          companyId: invitation.companyId,
          developerId: developer.id,
          stage: 'REGISTERING',
        },
      });
    }

    // Send verification email (don't await - send in background)
    this.emailService
      .sendVerificationEmail(
        developer.email,
        emailVerificationToken,
        'developer',
      )
      .catch((err) => console.error('Failed to send verification email:', err));

    // Generate tokens
    const tokens = await this.generateTokens(
      developer.id,
      developer.email,
      'DEVELOPER',
    );

    // Update refresh token hash in database
    await this.updateRefreshTokenHash(developer.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
      assessmentStatus: developer.assessmentStatus,
    };
  }

  async signin(dto: DeveloperSigninDto): Promise<DeveloperAuthResult> {
    // Find developer by email
    const developer = await this.prisma.developer.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!developer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const passwordValid = await argon2.verify(
      developer.hashedPassword,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      developer.id,
      developer.email,
      'DEVELOPER',
    );

    // Update refresh token hash
    await this.updateRefreshTokenHash(developer.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
      assessmentStatus: developer.assessmentStatus,
    };
  }

  async logout(developerId: number): Promise<void> {
    // Clear the refresh token hash
    await this.prisma.developer.update({
      where: { id: developerId },
      data: { hashedRefreshToken: null },
    });
  }

  async refreshTokens(
    developerId: number,
    refreshToken: string,
  ): Promise<Tokens> {
    // Find developer
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer || !developer.hashedRefreshToken) {
      throw new ForbiddenException('Access denied');
    }

    // Verify refresh token
    const rtValid = await argon2.verify(
      developer.hashedRefreshToken,
      refreshToken,
    );

    if (!rtValid) {
      throw new ForbiddenException('Access denied');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      developer.id,
      developer.email,
      'DEVELOPER',
    );

    // Update refresh token hash
    await this.updateRefreshTokenHash(developer.id, tokens.refreshToken);

    return tokens;
  }

  async getMe(developerId: number): Promise<DeveloperAuthResponseDto> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      throw new UnauthorizedException('Developer not found');
    }

    return {
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
      assessmentStatus: developer.assessmentStatus,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const developer = await this.prisma.developer.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!developer) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (developer.emailVerified) {
      return { message: 'Email already verified' };
    }

    await this.prisma.developer.update({
      where: { id: developer.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(
    developerId: number,
  ): Promise<{ message: string }> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      throw new UnauthorizedException('Developer not found');
    }

    if (developer.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.developer.update({
      where: { id: developer.id },
      data: { emailVerificationToken },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(
      developer.email,
      emailVerificationToken,
      'developer',
    );

    return { message: 'Verification email sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const developer = await this.prisma.developer.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success message to prevent email enumeration
    if (!developer) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Generate reset token (64 char hex)
    const passwordResetToken = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.developer.update({
      where: { id: developer.id },
      data: {
        passwordResetToken,
        passwordResetExpiresAt,
      },
    });

    // Send reset email (don't await - send in background)
    this.emailService
      .sendPasswordResetEmail(developer.email, passwordResetToken)
      .catch((err) =>
        console.error('Failed to send password reset email:', err),
      );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const developer = await this.prisma.developer.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!developer) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await argon2.hash(dto.newPassword);

    // Update password and clear reset token
    await this.prisma.developer.update({
      where: { id: developer.id },
      data: {
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        // Also clear refresh token to force re-login on all devices
        hashedRefreshToken: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(
    userId: number,
    email: string,
    role: 'COMPANY' | 'DEVELOPER',
  ): Promise<Tokens> {
    const payload = {
      sub: userId,
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

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshTokenHash(
    developerId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.prisma.developer.update({
      where: { id: developerId },
      data: { hashedRefreshToken },
    });
  }
}
