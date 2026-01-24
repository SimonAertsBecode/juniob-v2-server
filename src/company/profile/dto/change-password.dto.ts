import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, must include uppercase, lowercase, and number)',
    example: 'NewPassword123',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must include uppercase, lowercase, and number',
  })
  newPassword: string;
}
