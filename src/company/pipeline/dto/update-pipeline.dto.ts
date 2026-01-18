import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating pipeline stage
 * Note: Only HIRED and REJECTED stages can be manually set by companies
 * Other stages are auto-updated based on developer actions
 */
export class UpdatePipelineStageDto {
  @ApiProperty({
    description: 'New pipeline stage (only HIRED or REJECTED can be manually set)',
    enum: ['HIRED', 'REJECTED'],
  })
  @IsEnum(['HIRED', 'REJECTED'], {
    message: 'Only HIRED or REJECTED stages can be manually updated',
  })
  stage: 'HIRED' | 'REJECTED';
}

/**
 * DTO for updating pipeline notes
 */
export class UpdatePipelineNotesDto {
  @ApiPropertyOptional({
    description: 'Private notes about the candidate',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/**
 * DTO for adding developer to pipeline
 */
export class AddToPipelineDto {
  @ApiProperty({ description: 'Developer ID to add to pipeline' })
  developerId: number;

  @ApiPropertyOptional({
    description: 'Initial notes about the candidate',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
