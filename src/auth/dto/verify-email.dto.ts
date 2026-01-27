import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'Password (required for users who accepted an invitation)',
    example: 'SecurePassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must include uppercase, lowercase, and number',
  })
  password?: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Email verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether the user needs to set a password',
    example: false,
  })
  requiresPassword: boolean;
}
