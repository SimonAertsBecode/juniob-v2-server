import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Public invitation info (for accept page)
 */
export class InvitationInfoDto {
  @ApiProperty({ description: 'Whether the invitation is valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Candidate email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Personal message from company' })
  message?: string;

  @ApiPropertyOptional({ description: 'Whether the invitation has expired' })
  expired?: boolean;

  @ApiPropertyOptional({ description: 'Error message if invalid' })
  error?: string;
}
