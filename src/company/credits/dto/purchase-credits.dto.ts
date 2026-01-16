import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsIn } from 'class-validator';

// Credit packages available for purchase
export const CREDIT_PACKAGES = [1, 10, 25] as const;
export type CreditPackage = (typeof CREDIT_PACKAGES)[number];

export class PurchaseCreditsDto {
  @ApiProperty({
    description: 'Number of credits to purchase',
    enum: CREDIT_PACKAGES,
    example: 10,
  })
  @IsNumber()
  @IsIn(CREDIT_PACKAGES, { message: 'Credits must be one of: 1, 10, or 25' })
  credits: CreditPackage;
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
