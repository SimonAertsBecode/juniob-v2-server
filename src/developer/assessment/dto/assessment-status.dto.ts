import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssessmentStatusDto {
  @ApiProperty({
    description: 'Current assessment status',
    enum: [
      'REGISTERING',
      'PROJECTS_SUBMITTED',
      'ANALYZING',
      'PENDING_ANALYSIS',
      'ASSESSED',
    ],
  })
  status:
    | 'REGISTERING'
    | 'PROJECTS_SUBMITTED'
    | 'ANALYZING'
    | 'PENDING_ANALYSIS'
    | 'ASSESSED';

  @ApiProperty({ description: 'Human-readable status description' })
  statusDescription: string;

  @ApiProperty({ description: 'Number of projects submitted' })
  projectCount: number;

  @ApiProperty({ description: 'Number of projects analyzed' })
  analyzedCount: number;

  @ApiProperty({ description: 'Number of projects pending analysis' })
  pendingCount: number;

  @ApiProperty({ description: 'Whether hiring report has been generated' })
  hasHiringReport: boolean;

  @ApiPropertyOptional({ description: 'Overall score from hiring report' })
  overallScore?: number;

  @ApiPropertyOptional({
    description: 'Detected tech stack across all projects',
  })
  techStack?: string[];

  @ApiProperty({ description: 'Whether profile is visible to companies' })
  isVisibleToCompanies: boolean;

  @ApiPropertyOptional({ description: 'Reason if not visible' })
  visibilityReason?: string;
}
