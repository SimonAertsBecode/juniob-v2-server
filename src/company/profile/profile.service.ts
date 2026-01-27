import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import {
  CompanyProfileDto,
  UpdateCompanyProfileDto,
  ChangePasswordDto,
} from './dto';
import { CreditTransactionType } from '../../../prisma/generated/prisma';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(companyId: number): Promise<CompanyProfileDto> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        user: {
          select: {
            email: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if billing is locked (has any purchase transactions)
    const billingLocked = await this.isBillingLocked(companyId);

    return {
      id: company.id,
      email: company.user.email,
      name: company.name,
      industry: company.industry ?? undefined,
      size: company.size ?? undefined,
      location: company.location ?? undefined,
      website: company.website ?? undefined,
      vatNumber: company.vatNumber ?? undefined,
      billingAddress: company.billingAddress ?? undefined,
      billingCountry: company.billingCountry ?? undefined,
      emailVerified: company.user.emailVerified,
      emailNotifications: company.emailNotifications,
      creditBalance: company.creditBalance,
      billingLocked,
      createdAt: company.createdAt,
    };
  }

  /**
   * Check if billing info is locked (company has made at least one purchase)
   */
  private async isBillingLocked(companyId: number): Promise<boolean> {
    const purchaseCount = await this.prisma.creditTransaction.count({
      where: {
        companyId,
        type: CreditTransactionType.PURCHASE,
      },
    });
    return purchaseCount > 0;
  }

  async updateProfile(
    companyId: number,
    dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileDto> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if trying to update billing info when locked
    const isBillingUpdate =
      dto.vatNumber !== undefined ||
      dto.billingAddress !== undefined ||
      dto.billingCountry !== undefined;

    if (isBillingUpdate) {
      const billingLocked = await this.isBillingLocked(companyId);
      if (billingLocked) {
        throw new ForbiddenException(
          'Billing information cannot be modified after a payment has been made. Please contact support@juniob.io for assistance.',
        );
      }
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
        ...(dto.billingAddress !== undefined && {
          billingAddress: dto.billingAddress,
        }),
        ...(dto.billingCountry !== undefined && {
          billingCountry: dto.billingCountry,
        }),
        ...(dto.emailNotifications !== undefined && {
          emailNotifications: dto.emailNotifications,
        }),
      },
      include: { user: true },
    });

    // Get billing locked status for response
    const billingLocked = await this.isBillingLocked(companyId);

    return {
      id: updated.id,
      email: updated.user.email,
      name: updated.name,
      industry: updated.industry ?? undefined,
      size: updated.size ?? undefined,
      location: updated.location ?? undefined,
      website: updated.website ?? undefined,
      vatNumber: updated.vatNumber ?? undefined,
      billingAddress: updated.billingAddress ?? undefined,
      billingCountry: updated.billingCountry ?? undefined,
      emailVerified: updated.user.emailVerified,
      emailNotifications: updated.emailNotifications,
      creditBalance: updated.creditBalance,
      billingLocked,
      createdAt: updated.createdAt,
    };
  }

  async changePassword(
    companyId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(
      company.user.hashedPassword,
      dto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(dto.newPassword);

    // Update password
    const user = await this.getUserByCompanyTableId(companyId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  private async getUserByCompanyTableId(companyId: number) {
    const table = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        userId: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: table.userId },
    });

    return user ?? null;
  }
}
