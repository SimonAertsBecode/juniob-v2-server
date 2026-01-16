import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Candidate email address',
    example: 'developer@example.com',
  })
  @IsEmail()
  candidateEmail: string;

  @ApiProperty({
    description: 'Optional personal message to include in invitation email',
    example:
      'Hi! We loved your portfolio and would like to learn more about your skills.',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description:
      'Whether to send an invitation email (default: false, just track)',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}
