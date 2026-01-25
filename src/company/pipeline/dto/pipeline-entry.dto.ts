import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Developer info for pipeline entry
 */
export class PipelineDeveloperDto {
  @ApiProperty({ description: 'Developer ID' })
  id: number;

  @ApiProperty({ description: 'Developer email' })
  email: string;

  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiProperty({ description: 'Assessment status' })
  assessmentStatus: string;

  @ApiPropertyOptional({ description: 'Overall score (if assessed)' })
  overallScore?: number;

  @ApiProperty({ description: 'Tech stack from projects', type: [String] })
  techStack: string[];

  @ApiProperty({ description: 'Number of projects submitted' })
  projectCount: number;
}

/**
 * Tag info for pipeline entry
 */
export class PipelineTagDto {
  @ApiProperty({ description: 'Tag ID' })
  id: number;

  @ApiProperty({ description: 'Tag name' })
  name: string;

  @ApiProperty({ description: 'Tag color (hex)' })
  color: string;
}

/**
 * Single pipeline entry
 */
export class PipelineEntryDto {
  @ApiProperty({ description: 'Pipeline entry ID' })
  id: number;

  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Developer ID' })
  developerId: number;

  @ApiProperty({
    description: 'Pipeline stage',
    enum: [
      'INVITED',
      'REGISTERING',
      'PROJECTS_SUBMITTED',
      'ANALYZING',
      'PENDING_ANALYSIS',
      'ASSESSED',
      'UNLOCKED',
      'HIRED',
      'REJECTED',
    ],
  })
  stage: string;

  @ApiPropertyOptional({ description: 'Private notes about candidate' })
  notes?: string;

  @ApiProperty({ description: 'Whether report is unlocked by this company' })
  isUnlocked: boolean;

  @ApiProperty({ description: 'Developer info' })
  developer: PipelineDeveloperDto;

  @ApiProperty({
    description: 'Tags assigned to this entry',
    type: [PipelineTagDto],
  })
  tags: PipelineTagDto[];

  @ApiProperty({ description: 'Entry created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Entry last updated at' })
  updatedAt: Date;

  // Virtual fields for pending invitations (unregistered candidates)
  @ApiPropertyOptional({
    description:
      'True if this entry represents a pending invitation (unregistered candidate)',
  })
  isPendingInvitation?: boolean;

  @ApiPropertyOptional({ description: 'Invitation ID if pending invitation' })
  invitationId?: number;

  @ApiPropertyOptional({
    description: 'Invitation status if pending invitation',
    enum: ['PENDING', 'EXPIRED'],
  })
  invitationStatus?: 'PENDING' | 'EXPIRED';
}
