import { ApiProperty } from '@nestjs/swagger';

export class PurchaseValidationDto {
  @ApiProperty({
    description: 'Whether company has valid billing info for purchase',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'List of validation errors if any',
    example: ['VAT number is required', 'Billing address is required'],
    type: [String],
  })
  errors: string[];
}
