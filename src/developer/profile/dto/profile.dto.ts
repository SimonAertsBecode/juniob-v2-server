import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeveloperTypeEnum } from './technical-profile.dto';

/**
 * Technology experience entry
 */
export class TechExperienceDto {
  @ApiProperty({ description: 'Stack name', example: 'React.js' })
  stackName: string;

  @ApiProperty({
    description: 'Experience in months',
    example: 12,
    minimum: 1,
  })
  months: number;
}

/**
 * Technical profile nested in response
 */
export class TechnicalProfileNestedDto {
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
}

/**
 * Developer full profile response (basic info + technical profile)
 */
export class ProfileResponseDto {
  @ApiProperty({ description: 'Developer ID' })
  developerId: number;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'First name', nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Last name', nullable: true })
  lastName: string | null;

  @ApiProperty({ description: 'Location', nullable: true })
  location: string | null;

  @ApiPropertyOptional({
    description: 'Technical profile (developer type and experiences)',
    type: TechnicalProfileNestedDto,
    nullable: true,
  })
  technicalProfile: TechnicalProfileNestedDto | null;

  @ApiProperty({ description: 'Profile creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Profile last update date' })
  updatedAt: Date;
}

// Re-export for backwards compatibility
export { DeveloperTypeEnum };
