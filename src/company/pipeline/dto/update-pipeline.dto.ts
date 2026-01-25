import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

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
