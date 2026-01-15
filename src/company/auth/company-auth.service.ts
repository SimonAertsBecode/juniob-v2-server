import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { Tokens } from '../../common/types';
import {
  CompanySignupDto,
  CompanySigninDto,
  CompanyAuthResponseDto,
  CompanyAuthResult,
} from './dto';
import { CreditTransactionType } from '../../../prisma/generated/prisma';

@Injectable()
export class CompanyAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
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

    // Create the company with initial credits
    const company = await this.prisma.company.create({
      data: {
        email: dto.email.toLowerCase(),
        hashedPassword,
        name: dto.name,
        creditBalance: 3, // 3 free credits on registration
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
      companyId: company.id,
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
      companyId: company.id,
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
      accessToken: '', // Not returned for getMe
      companyId: company.id,
      email: company.email,
      name: company.name,
      emailVerified: company.emailVerified,
      creditBalance: company.creditBalance,
    };
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
