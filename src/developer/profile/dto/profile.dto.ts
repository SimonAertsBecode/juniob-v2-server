import { ApiProperty } from '@nestjs/swagger';

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
 * Developer profile response
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
