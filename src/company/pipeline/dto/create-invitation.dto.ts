import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the candidate to invite',
    example: 'candidate@example.com',
  })
  @IsEmail()
  candidateEmail: string;

  @ApiPropertyOptional({
    description: 'Optional personal message to include in the invitation email',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Whether to send an invitation email (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
