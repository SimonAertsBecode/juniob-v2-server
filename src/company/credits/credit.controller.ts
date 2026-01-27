import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreditService } from './credit.service';
import { StripeService } from './stripe.service';
import {
  CreditBalanceDto,
  CreditHistoryDto,
  PurchaseCreditsDto,
  CheckoutSessionDto,
} from './dto';
import { GetCurrentUserTableId, Public } from '../../common/decorators';
import { PurchaseValidation } from './credit.service';

@ApiTags('Company Credits')
@Controller('company/credits')
export class CreditController {
  constructor(
    private creditService: CreditService,
    private stripeService: StripeService,
  ) {}

  @Get('balance')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current credit balance' })
  @ApiResponse({
    status: 200,
    description: 'Current credit balance',
    type: CreditBalanceDto,
  })
  async getBalance(
    @GetCurrentUserTableId() companyId: number,
  ): Promise<CreditBalanceDto> {
    return this.creditService.getBalance(companyId);
  }

  @Get('history')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get credit transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Credit transaction history',
    type: CreditHistoryDto,
  })
  async getHistory(
    @GetCurrentUserTableId() companyId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<CreditHistoryDto> {
    return this.creditService.getTransactionHistory(
      companyId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('validate-purchase')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Validate company has required billing info for purchase',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result with any errors',
  })
  async validatePurchase(
    @GetCurrentUserTableId() companyId: number,
  ): Promise<PurchaseValidation> {
    return this.creditService.validateCompanyForPurchase(companyId);
  }

  @Public()
  @Get('billing-countries')
  @ApiOperation({
    summary: 'Get list of supported billing countries',
  })
  @ApiResponse({
    status: 200,
    description: 'List of billing countries with ISO codes',
  })
  getBillingCountries() {
    return this.creditService.getBillingCountries();
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create Stripe checkout session to purchase credits',
  })
  @ApiResponse({
    status: 200,
    description: 'Stripe checkout session created',
    type: CheckoutSessionDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid credit package' })
  async purchaseCredits(
    @GetCurrentUserTableId() companyId: number,
    @Body() dto: PurchaseCreditsDto,
  ): Promise<CheckoutSessionDto> {
    return this.creditService.createCheckoutSession(companyId, dto.credits);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const payload = req.rawBody;
    if (!payload) {
      console.error('Webhook received without raw body');
      throw new BadRequestException('Missing request body');
    }
    if (!signature) {
      console.error('Webhook received without signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }
    return this.stripeService.handleWebhook(payload, signature);
  }
}
