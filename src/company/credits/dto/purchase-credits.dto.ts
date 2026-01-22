import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

// Suggested credit packages (shortcuts in UI)
export const CREDIT_PACKAGES = [
  { credits: 1, label: '1 Credit', pricePerCredit: 27 },
  { credits: 10, label: '10 Credits', pricePerCredit: 25, popular: true },
  { credits: 25, label: '25 Credits', pricePerCredit: 23 },
] as const;

// Flat rate pricing (used for custom amounts)
export const PRICE_PER_CREDIT = 27; // EUR

export class PurchaseCreditsDto {
  @ApiProperty({
    description: 'Number of credits to purchase (minimum 1)',
    example: 10,
    minimum: 1,
  })
  @IsInt({ message: 'Credits must be a whole number' })
  @Min(1, { message: 'Minimum purchase is 1 credit' })
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
