import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineEntryDto } from './pipeline-entry.dto';

/**
 * Pipeline entries grouped by stage
 */
export class PipelineGroupedDto {
  @ApiProperty({ description: 'Candidates invited but not yet registered', type: [PipelineEntryDto] })
  invited: PipelineEntryDto[];

  @ApiProperty({ description: 'Candidates currently registering', type: [PipelineEntryDto] })
  registering: PipelineEntryDto[];

  @ApiProperty({ description: 'Candidates who submitted projects', type: [PipelineEntryDto] })
  projectsSubmitted: PipelineEntryDto[];

  @ApiProperty({ description: 'Candidates with analysis in progress', type: [PipelineEntryDto] })
  analyzing: PipelineEntryDto[];

  @ApiProperty({ description: 'Candidates pending analysis regeneration', type: [PipelineEntryDto] })
  pendingAnalysis: PipelineEntryDto[];

  @ApiProperty({ description: 'Candidates with completed assessment', type: [PipelineEntryDto] })
  assessed: PipelineEntryDto[];

  @ApiProperty({ description: 'Candidates with unlocked reports', type: [PipelineEntryDto] })
  unlocked: PipelineEntryDto[];

  @ApiProperty({ description: 'Hired candidates', type: [PipelineEntryDto] })
  hired: PipelineEntryDto[];

  @ApiProperty({ description: 'Rejected candidates', type: [PipelineEntryDto] })
  rejected: PipelineEntryDto[];
}

/**
 * Pipeline list response (flat list with pagination)
 */
export class PipelineListDto {
  @ApiProperty({ description: 'Pipeline entries', type: [PipelineEntryDto] })
  entries: PipelineEntryDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current offset' })
  offset: number;

  @ApiProperty({ description: 'Limit per page' })
  limit: number;
}

/**
 * Query parameters for pipeline list
 */
export class PipelineQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by stage',
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
  stage?: string;

  @ApiPropertyOptional({ description: 'Limit', default: 50 })
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset', default: 0 })
  offset?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'updatedAt', 'stage'],
    default: 'updatedAt',
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  sortOrder?: string;
}
