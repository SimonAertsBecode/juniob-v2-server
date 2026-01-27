import { Module } from '@nestjs/common';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [CreditController],
  providers: [CreditService, StripeService],
  exports: [CreditService, StripeService],
})
export class CreditModule {}
