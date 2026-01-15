import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsString } from 'class-validator';

export class CompanyAuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'Company ID',
    example: 1,
  })
  @IsNumber()
  companyId: number;

  @ApiProperty({
    description: 'Company email',
    example: 'contact@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: false,
  })
  @IsBoolean()
  emailVerified: boolean;

  @ApiProperty({
    description: 'Current credit balance',
    example: 3,
  })
  @IsNumber()
  creditBalance: number;
}
