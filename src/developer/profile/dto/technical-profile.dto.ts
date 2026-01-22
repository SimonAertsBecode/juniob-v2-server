import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SetExperienceDto } from './experience.dto';
import { TechExperienceDto } from './profile.dto';

/**
 * Developer type enum
 */
export enum DeveloperTypeEnum {
  FRONTEND = 'FRONTEND',
  BACKEND = 'BACKEND',
  FULLSTACK = 'FULLSTACK',
  MOBILE = 'MOBILE',
}

/**
 * Technical profile response
 */
export class TechnicalProfileResponseDto {
  @ApiProperty({ description: 'Technical profile ID' })
  id: number;

  @ApiProperty({ description: 'Developer ID' })
  developerId: number;

  @ApiProperty({
    description: 'Developer type (specialization)',
    enum: DeveloperTypeEnum,
  })
  developerType: DeveloperTypeEnum;

  @ApiProperty({
    description: 'Technology experiences',
    type: [TechExperienceDto],
  })
  techExperiences: TechExperienceDto[];

  @ApiProperty({ description: 'Profile creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Profile last update date' })
  updatedAt: Date;
}

/**
 * Update or create technical profile
 */
export class UpdateTechnicalProfileDto {
  @ApiProperty({
    description: 'Developer type (specialization)',
    enum: DeveloperTypeEnum,
    example: DeveloperTypeEnum.FULLSTACK,
  })
  @IsEnum(DeveloperTypeEnum)
  developerType: DeveloperTypeEnum;

  @ApiProperty({
    description: 'Array of technology experiences (minimum 3)',
    type: [SetExperienceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(3, { message: 'At least 3 technologies are required' })
  @Type(() => SetExperienceDto)
  experiences: SetExperienceDto[];
}

/**
 * Partial update for technical profile (when only updating experiences)
 */
export class UpdateTechExperiencesDto {
  @ApiPropertyOptional({
    description: 'Developer type (specialization)',
    enum: DeveloperTypeEnum,
    example: DeveloperTypeEnum.FULLSTACK,
  })
  @IsOptional()
  @IsEnum(DeveloperTypeEnum)
  developerType?: DeveloperTypeEnum;

  @ApiProperty({
    description: 'Array of technology experiences (minimum 3)',
    type: [SetExperienceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(3, { message: 'At least 3 technologies are required' })
  @Type(() => SetExperienceDto)
  experiences: SetExperienceDto[];
}
