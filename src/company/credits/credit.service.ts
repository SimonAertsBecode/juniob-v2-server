import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreditBalanceDto,
  CreditHistoryDto,
  CreditTransactionDto,
  CheckoutSessionDto,
  PRICE_PER_CREDIT,
} from './dto';
import { CreditTransactionType } from '../../../prisma/generated/prisma';

@Injectable()
export class CreditService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
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
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { user: { select: { email: true } }, name: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Flat rate pricing: 27 EUR per credit (in cents)
    const priceInCents = credits * PRICE_PER_CREDIT * 100;
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: company.user.email,
      client_reference_id: companyId.toString(),
      metadata: {
        companyId: companyId.toString(),
        credits: credits.toString(),
        type: 'credit_purchase',
      },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${credits} Juniob Credit${credits > 1 ? 's' : ''}`,
              description: `Unlock ${credits} developer report${credits > 1 ? 's' : ''}`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/company/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/company/credits?canceled=true`,
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  }

  async handleStripeWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<{ received: boolean }> {
    const webhookSecret = this.config.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (_err) {
      throw new BadRequestException(`Webhook signature verification failed`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this.handleSuccessfulPayment(session);
    }

    return { received: true };
  }

  private async handleSuccessfulPayment(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const companyId = parseInt(session.metadata?.companyId || '0', 10);
    const credits = parseInt(session.metadata?.credits || '0', 10);

    if (!companyId || !credits) {
      console.error('Invalid metadata in Stripe session:', session.metadata);
      return;
    }

    // Use a transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Get current balance
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { creditBalance: true },
      });

      if (!company) {
        console.error('Company not found for credit purchase:', companyId);
        return;
      }

      const newBalance = company.creditBalance + credits;

      // Update balance
      await tx.company.update({
        where: { id: companyId },
        data: { creditBalance: newBalance },
      });

      // Record transaction
      await tx.creditTransaction.create({
        data: {
          companyId,
          type: CreditTransactionType.PURCHASE,
          amount: credits,
          balanceAfter: newBalance,
          description: `Purchased ${credits} credit${credits > 1 ? 's' : ''}`,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
        },
      });
    });
  }

  async deductCredit(
    companyId: number,
    developerId: number,
  ): Promise<{ success: boolean; newBalance: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Get current balance
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

      // Update balance
      await tx.company.update({
        where: { id: companyId },
        data: { creditBalance: newBalance },
      });

      // Record transaction
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
}
