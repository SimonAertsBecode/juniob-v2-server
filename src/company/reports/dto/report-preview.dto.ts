import { ApiProperty } from '@nestjs/swagger';

/**
 * Project info for report preview (limited info)
 */
export class ProjectPreviewDto {
  @ApiProperty({ description: 'Project ID' })
  id: number;

  @ApiProperty({ description: 'Project name' })
  name: string;

  @ApiProperty({ description: 'Project type', example: 'FULLSTACK' })
  projectType: string;

  @ApiProperty({
    description: 'Tech stack used',
    example: ['React', 'TypeScript', 'Node.js'],
  })
  techStack: string[];
}

/**
 * Report preview - what company sees before unlocking
 */
export class ReportPreviewDto {
  @ApiProperty({ description: 'Developer ID' })
  developerId: number;

  @ApiProperty({ description: 'Developer email' })
  email: string;

  @ApiProperty({ description: 'Developer first name', nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Developer last name', nullable: true })
  lastName: string | null;

  @ApiProperty({ description: 'Overall technical score (0-100)' })
  overallScore: number;

  @ApiProperty({ description: 'Number of projects analyzed' })
  projectCount: number;

  @ApiProperty({
    description: 'All tech stack tags combined',
    example: ['React', 'TypeScript', 'Node.js'],
  })
  techStack: string[];

  @ApiProperty({ description: 'Years of experience', nullable: true })
  yearsOfExperience: number | null;

  @ApiProperty({
    description: 'Junior level assessment',
    example: 'MID_JUNIOR',
  })
  juniorLevel: string;

  @ApiProperty({ description: 'Project previews (limited info)' })
  projects: ProjectPreviewDto[];

  @ApiProperty({
    description: 'Whether the report is unlocked by this company',
  })
  isUnlocked: boolean;

  @ApiProperty({ description: 'Assessment completion date' })
  assessedAt: Date;
}
