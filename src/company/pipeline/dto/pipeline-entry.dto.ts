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

  @ApiPropertyOptional({
    description: 'Developer type (FRONTEND, BACKEND, FULLSTACK, MOBILE)',
    enum: ['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE'],
  })
  developerType?: string;

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

  @ApiPropertyOptional({ description: 'Developer ID (null for pending invitations)' })
  developerId?: number;

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

  // Invitation fields (populated for pending invitations)
  @ApiPropertyOptional({
    description: 'Candidate email (for pending invitations)',
  })
  candidateEmail?: string;

  @ApiPropertyOptional({
    description: 'Invitation token for registration link',
  })
  invitationToken?: string;

  @ApiPropertyOptional({
    description: 'Personal message from company',
  })
  invitationMessage?: string;

  @ApiPropertyOptional({
    description: 'When invitation was sent',
  })
  invitedAt?: Date;

  @ApiPropertyOptional({
    description: 'Token expiration date',
  })
  tokenExpiresAt?: Date;

  // Computed fields for pending invitations
  @ApiPropertyOptional({
    description:
      'True if this entry represents a pending invitation (unregistered candidate)',
  })
  isPendingInvitation?: boolean;

  @ApiPropertyOptional({
    description: 'Invitation status: PENDING, EXPIRED, or TRACKED',
    enum: ['PENDING', 'EXPIRED', 'TRACKED'],
  })
  invitationStatus?: 'PENDING' | 'EXPIRED' | 'TRACKED';
}
