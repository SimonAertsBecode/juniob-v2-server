import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUrl,
  IsBoolean,
  IsIn,
} from 'class-validator';

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corporation',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Technology',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company size',
    example: '11-50',
    enum: COMPANY_SIZES,
  })
  @IsOptional()
  @IsString()
  @IsIn(COMPANY_SIZES, { message: 'Invalid company size' })
  size?: string;

  @ApiPropertyOptional({
    description: 'Location',
    example: 'Paris, France',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://acme.com',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please enter a valid URL' })
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({
    description: 'VAT number',
    example: 'FR12345678901',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Billing address',
    example: '123 Main Street, 75001 Paris',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  billingAddress?: string;

  @ApiPropertyOptional({
    description: 'Billing country',
    example: 'France',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingCountry?: string;

  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
