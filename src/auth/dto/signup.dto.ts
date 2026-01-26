import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum SignupRole {
  DEVELOPER = 'DEVELOPER',
  COMPANY = 'COMPANY',
}

export class SignupDto {
  @ApiProperty({ enum: SignupRole, description: 'User role' })
  @IsEnum(SignupRole)
  role: SignupRole;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  // Developer-specific fields (required if role=DEVELOPER)
  @ApiPropertyOptional({ example: 'John' })
  @ValidateIf((o) => o.role === SignupRole.DEVELOPER)
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @ValidateIf((o) => o.role === SignupRole.DEVELOPER)
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Invitation token for developer signup' })
  @IsOptional()
  @IsString()
  invitationToken?: string;

  // Company-specific fields (required if role=COMPANY)
  @ApiPropertyOptional({ example: 'Acme Corporation' })
  @ValidateIf((o) => o.role === SignupRole.COMPANY)
  @IsString()
  @IsNotEmpty()
  companyName?: string;
}
