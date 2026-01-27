import {
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
import {
  CreditBalanceDto,
  CreditHistoryDto,
  PurchaseCreditsDto,
  CheckoutSessionDto,
} from './dto';
import { GetCurrentUserTableId, Public } from '../../common/decorators';

@ApiTags('Company Credits')
@Controller('company/credits')
export class CreditController {
  constructor(private creditService: CreditService) {}

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
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const payload = req.rawBody;
    if (!payload) {
      throw new Error('Missing raw body');
    }
    return this.creditService.handleStripeWebhook(payload, signature);
  }
}
