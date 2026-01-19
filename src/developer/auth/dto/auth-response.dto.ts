import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssessmentStatus } from '../../../../prisma/generated/prisma';

export class DeveloperAuthResponseDto {
  @ApiProperty({
    description: 'Developer ID',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Developer email',
    example: 'john.doe@email.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName: string | null;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName: string | null;

  @ApiProperty({
    description: 'Whether email is verified',
    example: false,
  })
  @IsBoolean()
  emailVerified: boolean;

  @ApiProperty({
    description: 'Current assessment status',
    enum: AssessmentStatus,
    example: AssessmentStatus.REGISTERING,
  })
  @IsEnum(AssessmentStatus)
  assessmentStatus: AssessmentStatus;
}
