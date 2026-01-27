import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token from the email link',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Password for the new account',
    example: 'SecurePassword123',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must include uppercase, lowercase, and number',
  })
  password: string;
}
