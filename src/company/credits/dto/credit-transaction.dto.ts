import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';

export enum CreditTransactionTypeDto {
  INITIAL = 'INITIAL',
  PURCHASE = 'PURCHASE',
  UNLOCK_REPORT = 'UNLOCK_REPORT',
}

export class CreditTransactionDto {
  @ApiProperty({ description: 'Transaction ID', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: CreditTransactionTypeDto,
    example: CreditTransactionTypeDto.PURCHASE,
  })
  @IsEnum(CreditTransactionTypeDto)
  type: CreditTransactionTypeDto;

  @ApiProperty({
    description: 'Amount (positive for purchase, negative for unlock)',
    example: 10,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Balance after transaction', example: 13 })
  @IsNumber()
  balanceAfter: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Welcome bonus - 3 free credits',
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    description: 'Transaction date',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  createdAt: Date;
}

export class CreditHistoryDto {
  @ApiProperty({
    description: 'List of credit transactions',
    type: [CreditTransactionDto],
  })
  transactions: CreditTransactionDto[];

  @ApiProperty({ description: 'Total number of transactions', example: 25 })
  @IsNumber()
  total: number;
}
