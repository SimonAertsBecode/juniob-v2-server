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
  CompanySignupDto,
  CompanySigninDto,
  CompanyAuthResponseDto,
  CompanyAuthResult,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { CreditTransactionType } from '../../../prisma/generated/prisma';

@Injectable()
export class CompanyAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async signup(dto: CompanySignupDto): Promise<CompanyAuthResult> {
    // Check if company with this email already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingCompany) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash the password
    const hashedPassword = await argon2.hash(dto.password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create the company with initial credits
    const company = await this.prisma.company.create({
      data: {
        email: dto.email.toLowerCase(),
        hashedPassword,
        name: dto.name,
        creditBalance: 3, // 3 free credits on registration
        emailVerificationToken,
      },
    });

    // Record the initial credit transaction
    await this.prisma.creditTransaction.create({
      data: {
        companyId: company.id,
        type: CreditTransactionType.INITIAL,
        amount: 3,
        balanceAfter: 3,
        description: 'Welcome bonus - 3 free credits',
      },
    });

    // Send verification email (don't await - send in background)
    this.emailService
      .sendVerificationEmail(company.email, emailVerificationToken, 'company')
      .catch((err) => console.error('Failed to send verification email:', err));

    // Generate tokens
    const tokens = await this.generateTokens(
      company.id,
      company.email,
      'COMPANY',
    );

    // Update refresh token hash in database
    await this.updateRefreshTokenHash(company.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: company.id,
      email: company.email,
      name: company.name,
      emailVerified: company.emailVerified,
      creditBalance: company.creditBalance,
    };
  }

  async signin(dto: CompanySigninDto): Promise<CompanyAuthResult> {
    // Find company by email
    const company = await this.prisma.company.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!company) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const passwordValid = await argon2.verify(
      company.hashedPassword,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      company.id,
      company.email,
      'COMPANY',
    );

    // Update refresh token hash
    await this.updateRefreshTokenHash(company.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: company.id,
      email: company.email,
      name: company.name,
      emailVerified: company.emailVerified,
      creditBalance: company.creditBalance,
    };
  }

  async logout(companyId: number): Promise<void> {
    // Clear the refresh token hash
    await this.prisma.company.update({
      where: { id: companyId },
      data: { hashedRefreshToken: null },
    });
  }

  async refreshTokens(
    companyId: number,
    refreshToken: string,
  ): Promise<Tokens> {
    // Find company
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.hashedRefreshToken) {
      throw new ForbiddenException('Access denied');
    }

    // Verify refresh token
    const rtValid = await argon2.verify(
      company.hashedRefreshToken,
      refreshToken,
    );

    if (!rtValid) {
      throw new ForbiddenException('Access denied');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      company.id,
      company.email,
      'COMPANY',
    );

    // Update refresh token hash
    await this.updateRefreshTokenHash(company.id, tokens.refreshToken);

    return tokens;
  }

  async getMe(companyId: number): Promise<CompanyAuthResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new UnauthorizedException('Company not found');
    }

    return {
      id: company.id,
      email: company.email,
      name: company.name,
      emailVerified: company.emailVerified,
      creditBalance: company.creditBalance,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const company = await this.prisma.company.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!company) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (company.emailVerified) {
      return { message: 'Email already verified' };
    }

    await this.prisma.company.update({
      where: { id: company.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(
    companyId: number,
  ): Promise<{ message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new UnauthorizedException('Company not found');
    }

    if (company.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.company.update({
      where: { id: company.id },
      data: { emailVerificationToken },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(
      company.email,
      emailVerificationToken,
      'company',
    );

    return { message: 'Verification email sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success message to prevent email enumeration
    if (!company) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Generate reset token (64 char hex)
    const passwordResetToken = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.company.update({
      where: { id: company.id },
      data: {
        passwordResetToken,
        passwordResetExpiresAt,
      },
    });

    // Send reset email (don't await - send in background)
    this.emailService
      .sendPasswordResetEmail(company.email, passwordResetToken)
      .catch((err) =>
        console.error('Failed to send password reset email:', err),
      );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const company = await this.prisma.company.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!company) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await argon2.hash(dto.newPassword);

    // Update password and clear reset token
    await this.prisma.company.update({
      where: { id: company.id },
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

    // Use seconds for expiration (15 minutes for access, 7 days for refresh)
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
    companyId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.prisma.company.update({
      where: { id: companyId },
      data: { hashedRefreshToken },
    });
  }
}
