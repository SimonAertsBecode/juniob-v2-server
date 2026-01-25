import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineEntryDto } from './pipeline-entry.dto';

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

  @ApiPropertyOptional({
    description: 'Filter by tag IDs (comma-separated)',
    example: '1,2,3',
  })
  tagIds?: string;

  @ApiPropertyOptional({
    description: 'Search by developer email',
    example: 'john@example.com',
  })
  search?: string;

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
