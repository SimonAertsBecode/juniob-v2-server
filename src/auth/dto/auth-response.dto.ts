import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ enum: ['DEVELOPER', 'COMPANY'], description: 'User role' })
  role: 'DEVELOPER' | 'COMPANY';

  @ApiProperty({ description: 'Email verified status' })
  emailVerified: boolean;

  // Developer fields (if role=DEVELOPER)
  @ApiPropertyOptional({ description: 'Developer ID' })
  developerId?: number;

  @ApiPropertyOptional({ description: 'Developer first name' })
  firstName?: string | null;

  @ApiPropertyOptional({ description: 'Developer last name' })
  lastName?: string | null;

  @ApiPropertyOptional({ description: 'Developer assessment status' })
  assessmentStatus?: string;

  // Company fields (if role=COMPANY)
  @ApiPropertyOptional({ description: 'Company ID' })
  companyId?: number;

  @ApiPropertyOptional({ description: 'Company name' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company credit balance' })
  creditBalance?: number;
}

// Internal type including tokens (not returned to client)
export interface AuthResult extends AuthResponseDto {
  accessToken: string;
  refreshToken: string;
}
