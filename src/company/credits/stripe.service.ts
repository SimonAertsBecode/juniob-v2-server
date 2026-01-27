import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { checkVAT, countries } from 'jsvat-next';
import { CREDIT_PACKAGES } from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditTransactionType } from '../../../prisma/generated/prisma';

/**
 * Supported billing countries with ISO codes
 * Used for Stripe tax calculations and invoice generation
 */
export const BILLING_COUNTRIES = [
  { code: 'BE', name: 'Belgium' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'AT', name: 'Austria' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'NO', name: 'Norway' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
] as const;

export type BillingCountryCode = (typeof BILLING_COUNTRIES)[number]['code'];

export interface CreateCustomerParams {
  email: string;
  companyName: string;
  companyId: number;
  vatNumber?: string | null;
  billingAddress?: string | null;
  billingCountry?: string | null;
}

export interface CreateCheckoutParams {
  customerId: string;
  companyId: number;
  credits: number;
  pricePerCredit: number;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private frontendUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  /**
   * Get price per credit based on quantity (volume discounts)
   */
  getPricePerCredit(credits: number): number {
    const sortedPackages = [...CREDIT_PACKAGES].sort(
      (a, b) => b.credits - a.credits,
    );
    for (const pkg of sortedPackages) {
      if (credits >= pkg.credits) {
        return pkg.pricePerCredit;
      }
    }
    return CREDIT_PACKAGES[0].pricePerCredit;
  }

  /**
   * Validate that a country code is supported
   */
  isValidCountryCode(code: string): code is BillingCountryCode {
    return BILLING_COUNTRIES.some((c) => c.code === code);
  }

  /**
   * Validate VAT number format and checksum
   */
  validateVatNumber(vatNumber: string): {
    isValid: boolean;
    countryCode: string | null;
    error: string | null;
  } {
    if (!vatNumber?.trim()) {
      return {
        isValid: false,
        countryCode: null,
        error: 'VAT number is required',
      };
    }

    // Remove spaces and convert to uppercase
    const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase();

    // Check against all EU countries
    const result = checkVAT(cleanVat, countries);

    if (!result.isValid) {
      return {
        isValid: false,
        countryCode: null,
        error: 'Invalid VAT number format or checksum',
      };
    }

    return {
      isValid: true,
      countryCode: result.country?.isoCode.short || null,
      error: null,
    };
  }

  /**
   * Get or create Stripe customer for company
   */
  async getOrCreateStripeCustomer(
    companyId: number,
    email: string,
    companyName: string,
  ): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        stripeCustomerId: true,
        vatNumber: true,
        billingAddress: true,
        billingCountry: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Return existing customer ID if set
    if (company.stripeCustomerId) {
      return company.stripeCustomerId;
    }

    // Search for existing Stripe customer by email
    let customerId = await this.findCustomerByEmail(email);

    if (!customerId) {
      // Create new Stripe customer
      customerId = await this.createCustomer({
        email,
        companyName,
        companyId,
        vatNumber: company.vatNumber,
        billingAddress: company.billingAddress,
        billingCountry: company.billingCountry,
      });
    }

    // Store customer ID in database
    await this.prisma.company.update({
      where: { id: companyId },
      data: { stripeCustomerId: customerId },
    });

    return customerId;
  }

  /**
   * Search for existing Stripe customer by email
   */
  async findCustomerByEmail(email: string): Promise<string | null> {
    const existingCustomers = await this.stripe.customers.list({
      email,
      limit: 1,
    });
    return existingCustomers.data.length > 0
      ? existingCustomers.data[0].id
      : null;
  }

  /**
   * Create a new Stripe customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.companyName,
        metadata: {
          companyId: params.companyId.toString(),
        },
        tax_id_data: params.vatNumber
          ? [
              {
                type: 'eu_vat',
                value: params.vatNumber,
              },
            ]
          : undefined,
        address: params.billingAddress
          ? {
              line1: params.billingAddress,
              country: params.billingCountry || 'BE',
            }
          : undefined,
      });
      return customer.id;
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      throw new BadRequestException(
        'Failed to create payment profile. Please try again.',
      );
    }
  }

  /**
   * Create a Stripe checkout session for credit purchase
   */
  async createCheckoutSession(
    params: CreateCheckoutParams,
  ): Promise<CheckoutResult> {
    const { customerId, companyId, credits, pricePerCredit } = params;
    const totalPriceInCents = Math.round(credits * pricePerCredit * 100);

    const taxId = this.config.getOrThrow('STRIPE_TAX_ID');

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer: customerId,
        client_reference_id: companyId.toString(),
        metadata: {
          companyId: companyId.toString(),
          credits: credits.toString(),
          type: 'credit_purchase',
          pricePerCredit: pricePerCredit.toString(),
        },
        // Tax handling
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        // Invoice generation
        invoice_creation: {
          enabled: true,
          invoice_data: {
            account_tax_ids: [taxId],
            rendering_options: {
              amount_tax_display: 'exclude_tax',
            },
            footer: 'Juniob.io',
            description: `Juniob Credits Purchase - ${credits} credit${credits > 1 ? 's' : ''}`,
          },
        },
        line_items: [
          {
            price_data: {
              tax_behavior: 'exclusive',
              currency: 'eur',
              product_data: {
                name: `${credits} Juniob Credit${credits > 1 ? 's' : ''}`,
                description: `Unlock ${credits} developer report${credits > 1 ? 's' : ''} - ${pricePerCredit} EUR/credit`,
              },
              unit_amount: totalPriceInCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${this.frontendUrl}/company/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.frontendUrl}/company/credits?payment=cancelled`,
      });

      if (!session.url) {
        console.error('Stripe session created without URL:', session.id);
        throw new BadRequestException(
          'Payment session could not be created. Please try again.',
        );
      }

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Failed to create Stripe checkout session:', error);
      throw new BadRequestException(
        'Failed to create payment session. Please try again.',
      );
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(
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
    } catch (err) {
      // Signature verification failed - this is a security issue, reject the request
      console.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Webhook signature verification failed');
    }

    // Process the event - wrap in try-catch to always return 200
    // This prevents Stripe from retrying for application errors
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleSuccessfulPayment(session);
      }
      // Log unhandled event types for monitoring
      else {
        console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      // Log the error but return 200 to prevent retries
      // The idempotency check will handle any duplicates if we need to manually retry
      console.error(`Error processing webhook event ${event.id}:`, error);
    }

    return { received: true };
  }

  /**
   * Handle successful payment from webhook
   */
  private async handleSuccessfulPayment(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const companyId = parseInt(session.metadata?.companyId || '0', 10);
    const credits = parseInt(session.metadata?.credits || '0', 10);
    const sessionId = session.id;
    const paymentIntentId = (session.payment_intent as string) || null;
    const invoiceId = (session.invoice as string) || null;
    const customerVatNumber =
      session.customer_details?.tax_ids?.[0]?.value || null;

    if (!companyId || !credits) {
      console.error('Invalid metadata in Stripe session:', session.metadata);
      return;
    }

    // Idempotency check: verify this session hasn't already been processed
    const existingTransaction = await this.prisma.creditTransaction.findFirst({
      where: { stripeSessionId: sessionId },
    });

    if (existingTransaction) {
      console.log(
        `Session ${sessionId} already processed, skipping duplicate webhook`,
      );
      return;
    }

    // Log invoice ID if created
    if (invoiceId) {
      console.log(`Invoice created for session ${sessionId}: ${invoiceId}`);
    }

    // Use a transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { creditBalance: true, vatNumber: true },
      });

      if (!company) {
        console.error('Company not found for credit purchase:', companyId);
        return;
      }

      // If customer provided VAT during checkout, update it if not already set
      if (!company.vatNumber && customerVatNumber) {
        await tx.company.update({
          where: { id: companyId },
          data: { vatNumber: customerVatNumber },
        });
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
          stripeSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId,
        },
      });
    });
  }
}
