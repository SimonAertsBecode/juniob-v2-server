import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SigninDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePass123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
