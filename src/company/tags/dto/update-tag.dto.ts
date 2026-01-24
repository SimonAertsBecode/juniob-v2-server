import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

/**
 * Update an existing tag
 */
export class UpdateTagDto {
  @ApiPropertyOptional({ description: 'Tag name', example: 'Frontend' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: 'Hex color for UI', example: '#3B82F6' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #3B82F6)',
  })
  color?: string;
}
