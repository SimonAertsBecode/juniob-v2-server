import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FullReportDto, ReportPreviewDto } from './';

/**
 * Single report result in batch response
 */
export class BatchReportItemDto {
  @ApiProperty({ description: 'Developer ID' })
  developerId: number;

  @ApiProperty({ description: 'Whether the report is unlocked' })
  isUnlocked: boolean;

  @ApiPropertyOptional({ description: 'Full report data (if unlocked)' })
  fullReport?: FullReportDto;

  @ApiPropertyOptional({ description: 'Preview data (if not unlocked)' })
  preview?: ReportPreviewDto;
}

/**
 * Error info for a single report in batch
 */
export class BatchReportErrorDto {
  @ApiProperty({ description: 'Developer ID that caused the error' })
  developerId: number;

  @ApiProperty({ description: 'Error message' })
  message: string;
}

/**
 * Batch reports response
 */
export class BatchReportsDto {
  @ApiProperty({
    description: 'Successfully fetched reports',
    type: [BatchReportItemDto],
  })
  reports: BatchReportItemDto[];

  @ApiProperty({
    description: 'Errors for reports that could not be fetched',
    type: [BatchReportErrorDto],
  })
  errors: BatchReportErrorDto[];
}
