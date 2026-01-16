import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreditBalanceDto {
  @ApiProperty({ description: 'Current credit balance', example: 5 })
  @IsNumber()
  balance: number;
}
