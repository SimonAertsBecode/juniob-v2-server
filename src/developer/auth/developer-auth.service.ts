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
import { PrismaService } from '../../prisma/prisma.service';
import { Tokens } from '../../common/types';
import {
  DeveloperSignupDto,
  DeveloperSigninDto,
  DeveloperAuthResponseDto,
  DeveloperAuthResult,
} from './dto';
import { InvitationStatus } from '../../../prisma/generated/prisma';

@Injectable()
export class DeveloperAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
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

    // Create the developer
    const developer = await this.prisma.developer.create({
      data: {
        email: dto.email.toLowerCase(),
        hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // If invitation exists, mark it as accepted and link to developer
    if (invitation) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          developerId: developer.id,
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
      developerId: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
      assessmentStatus: developer.assessmentStatus,
      githubAppInstalled: developer.githubAppInstalled,
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
      developerId: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
      assessmentStatus: developer.assessmentStatus,
      githubAppInstalled: developer.githubAppInstalled,
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
      accessToken: '', // Not returned for getMe
      developerId: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      emailVerified: developer.emailVerified,
      assessmentStatus: developer.assessmentStatus,
      githubAppInstalled: developer.githubAppInstalled,
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
