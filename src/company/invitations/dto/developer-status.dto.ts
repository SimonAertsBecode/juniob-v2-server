import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';

export enum DeveloperStatusType {
  NOT_REGISTERED = 'NOT_REGISTERED',
  REGISTERING = 'REGISTERING',
  PROJECTS_SUBMITTED = 'PROJECTS_SUBMITTED',
  ANALYZING = 'ANALYZING',
  PENDING_ANALYSIS = 'PENDING_ANALYSIS',
  ASSESSED = 'ASSESSED',
}

export class DeveloperStatusDto {
  @ApiProperty({
    description: 'Whether the developer exists in the system',
    example: true,
  })
  @IsBoolean()
  exists: boolean;

  @ApiProperty({
    description: 'Developer status',
    enum: DeveloperStatusType,
    example: DeveloperStatusType.ASSESSED,
  })
  @IsEnum(DeveloperStatusType)
  status: DeveloperStatusType;

  @ApiProperty({
    description: 'Human-readable status description',
    example: 'Assessment complete - ready to unlock',
  })
  @IsString()
  statusDescription: string;

  @ApiProperty({ description: 'Developer ID', required: false })
  @IsNumber()
  @IsOptional()
  developerId?: number;

  @ApiProperty({ description: 'Developer name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Developer email' })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Whether the company has already unlocked this developer',
    example: false,
  })
  @IsBoolean()
  isUnlocked: boolean;

  @ApiProperty({
    description: 'Whether the company is already tracking this candidate',
    example: true,
  })
  @IsBoolean()
  isTracked: boolean;

  @ApiProperty({
    description: 'Overall score (only if assessed)',
    required: false,
    example: 75,
  })
  @IsNumber()
  @IsOptional()
  overallScore?: number;

  @ApiProperty({
    description: 'Number of projects analyzed',
    required: false,
    example: 3,
  })
  @IsNumber()
  @IsOptional()
  projectCount?: number;

  @ApiProperty({
    description: 'Tech stack tags',
    required: false,
    example: ['React', 'TypeScript', 'Node.js'],
  })
  @IsArray()
  @IsOptional()
  techStack?: string[];
}
