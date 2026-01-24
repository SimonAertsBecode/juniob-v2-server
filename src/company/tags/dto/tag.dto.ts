import { ApiProperty } from '@nestjs/swagger';

/**
 * Single tag response
 */
export class TagDto {
  @ApiProperty({ description: 'Tag ID' })
  id: number;

  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Tag name', example: 'Frontend' })
  name: string;

  @ApiProperty({ description: 'Hex color for UI', example: '#3B82F6' })
  color: string;

  @ApiProperty({ description: 'Number of pipeline entries with this tag' })
  usageCount: number;

  @ApiProperty({ description: 'Tag created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Tag last updated at' })
  updatedAt: Date;
}
