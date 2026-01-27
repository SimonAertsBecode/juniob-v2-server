import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

// Suggested credit packages (shortcuts in UI)
export const CREDIT_PACKAGES = [
  { credits: 1, label: '1 Credit', pricePerCredit: 25 },
  { credits: 10, label: '10 Credits', pricePerCredit: 23, popular: true },
  { credits: 25, label: '25 Credits', pricePerCredit: 20 },
] as const;

// Flat rate pricing (used for custom amounts)
export const PRICE_PER_CREDIT = 25; // EUR

// Maximum credits per purchase (security limit)
export const MAX_CREDITS_PER_PURCHASE = 1000;

export class PurchaseCreditsDto {
  @ApiProperty({
    description: 'Number of credits to purchase (1-1000)',
    example: 10,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt({ message: 'Credits must be a whole number' })
  @Min(1, { message: 'Minimum purchase is 1 credit' })
  @Max(MAX_CREDITS_PER_PURCHASE, {
    message: `Maximum purchase is ${MAX_CREDITS_PER_PURCHASE} credits per transaction`,
  })
  credits: number;
}

export class CheckoutSessionDto {
  @ApiProperty({
    description: 'Stripe checkout session URL',
    example: 'https://checkout.stripe.com/...',
  })
  url: string;

  @ApiProperty({
    description: 'Stripe checkout session ID',
    example: 'cs_test_...',
  })
  sessionId: string;
}
