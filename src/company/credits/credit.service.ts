import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreditBalanceDto,
  CreditHistoryDto,
  CreditTransactionDto,
  CheckoutSessionDto,
} from './dto';
import { CreditTransactionType } from '../../../prisma/generated/prisma';
import { StripeService, BILLING_COUNTRIES } from './stripe.service';

export interface PurchaseValidation {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class CreditService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Validate that company has required billing info for purchase
   */
  async validateCompanyForPurchase(
    companyId: number,
  ): Promise<PurchaseValidation> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        vatNumber: true,
        billingAddress: true,
        billingCountry: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const errors: string[] = [];

    if (!company.vatNumber?.trim()) {
      errors.push('VAT number is required for purchases');
    } else {
      // Validate VAT number format and checksum
      const vatValidation = this.stripeService.validateVatNumber(
        company.vatNumber,
      );
      if (!vatValidation.isValid) {
        errors.push(vatValidation.error || 'Invalid VAT number');
      }
    }

    if (!company.billingAddress?.trim()) {
      errors.push('Billing address is required for purchases');
    }

    if (!company.billingCountry?.trim()) {
      errors.push('Billing country is required for purchases');
    } else if (!this.stripeService.isValidCountryCode(company.billingCountry)) {
      errors.push('Invalid billing country. Please select a valid country.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getBalance(companyId: number): Promise<CreditBalanceDto> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { creditBalance: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return { balance: company.creditBalance };
  }

  async getTransactionHistory(
    companyId: number,
    limit = 50,
    offset = 0,
  ): Promise<CreditHistoryDto> {
    const [transactions, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.creditTransaction.count({
        where: { companyId },
      }),
    ]);

    return {
      transactions: transactions.map(
        (t): CreditTransactionDto => ({
          id: t.id,
          type: t.type as CreditTransactionDto['type'],
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          description: t.description,
          createdAt: t.createdAt,
        }),
      ),
      total,
    };
  }

  async createCheckoutSession(
    companyId: number,
    credits: number,
  ): Promise<CheckoutSessionDto> {
    // Validate company has required billing info
    const validation = await this.validateCompanyForPurchase(companyId);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('. '));
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { user: { select: { email: true } }, name: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get or create Stripe customer
    const customerId = await this.stripeService.getOrCreateStripeCustomer(
      companyId,
      company.user.email,
      company.name,
    );

    // Calculate price with volume discounts
    const pricePerCredit = this.stripeService.getPricePerCredit(credits);

    // Create checkout session via Stripe service
    const result = await this.stripeService.createCheckoutSession({
      customerId,
      companyId,
      credits,
      pricePerCredit,
    });

    return {
      url: result.url,
      sessionId: result.sessionId,
    };
  }

  async deductCredit(
    companyId: number,
    developerId: number,
  ): Promise<{ success: boolean; newBalance: number }> {
    return await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { creditBalance: true },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      if (company.creditBalance < 1) {
        throw new BadRequestException('Insufficient credits');
      }

      const newBalance = company.creditBalance - 1;

      await tx.company.update({
        where: { id: companyId },
        data: { creditBalance: newBalance },
      });

      await tx.creditTransaction.create({
        data: {
          companyId,
          type: CreditTransactionType.UNLOCK_REPORT,
          amount: -1,
          balanceAfter: newBalance,
          description: `Unlocked developer report`,
          unlockedDeveloperId: developerId,
        },
      });

      return { success: true, newBalance };
    });
  }

  async hasEnoughCredits(companyId: number, amount = 1): Promise<boolean> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { creditBalance: true },
    });

    return (company?.creditBalance ?? 0) >= amount;
  }

  /**
   * Get list of supported billing countries
   */
  getBillingCountries() {
    return BILLING_COUNTRIES;
  }
}
