import { ApiProperty } from '@nestjs/swagger';

export class BillingCountryDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'BE',
  })
  code: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Belgium',
  })
  name: string;
}
