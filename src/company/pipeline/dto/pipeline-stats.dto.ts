import { ApiProperty } from '@nestjs/swagger';

/**
 * Pipeline statistics - count per stage
 */
export class PipelineStatsDto {
  @ApiProperty({ description: 'Number of invited candidates' })
  invited: number;

  @ApiProperty({ description: 'Number of registering candidates' })
  registering: number;

  @ApiProperty({ description: 'Number of candidates with submitted projects' })
  projectsSubmitted: number;

  @ApiProperty({ description: 'Number of candidates with analysis in progress' })
  analyzing: number;

  @ApiProperty({ description: 'Number of candidates pending analysis' })
  pendingAnalysis: number;

  @ApiProperty({ description: 'Number of assessed candidates' })
  assessed: number;

  @ApiProperty({ description: 'Number of unlocked reports' })
  unlocked: number;

  @ApiProperty({ description: 'Number of hired candidates' })
  hired: number;

  @ApiProperty({ description: 'Number of rejected candidates' })
  rejected: number;

  @ApiProperty({ description: 'Total candidates in pipeline' })
  total: number;
}
