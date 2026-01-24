import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyProfileDto {
  @ApiProperty({ description: 'Company ID' })
  id: number;

  @ApiProperty({ description: 'Company email' })
  email: string;

  @ApiProperty({ description: 'Company name' })
  name: string;

  @ApiPropertyOptional({ description: 'Industry' })
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size (e.g., "1-10", "11-50")' })
  size?: string;

  @ApiPropertyOptional({ description: 'Location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'VAT number' })
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Billing address' })
  billingAddress?: string;

  @ApiPropertyOptional({ description: 'Billing country' })
  billingCountry?: string;

  @ApiProperty({ description: 'Whether email is verified' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Whether email notifications are enabled' })
  emailNotifications: boolean;

  @ApiProperty({ description: 'Current credit balance' })
  creditBalance: number;

  @ApiProperty({ description: 'Account created at' })
  createdAt: Date;
}
