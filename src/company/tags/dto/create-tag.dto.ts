import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

/**
 * Create a new tag
 */
export class CreateTagDto {
  @ApiProperty({ description: 'Tag name', example: 'Frontend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Hex color for UI', example: '#3B82F6' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #3B82F6)',
  })
  color: string;
}
