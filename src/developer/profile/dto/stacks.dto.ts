import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Stack info for listing
 */
export class StackDto {
  @ApiProperty({ description: 'Stack name', example: 'React.js' })
  name: string;

  @ApiProperty({
    description: 'Category',
    enum: ['language', 'skill'],
    example: 'language',
  })
  category: 'language' | 'skill';
}

/**
 * Query parameters for stack search
 */
export class SearchStacksQueryDto {
  @ApiPropertyOptional({
    description: 'Search query to filter stacks (case-insensitive)',
    example: 'react',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string;
}

/**
 * Response for stack search (max 10 results)
 */
export class StackSearchResponseDto {
  @ApiProperty({
    description: 'Matching stacks (max 10, alphabetically sorted)',
    type: [StackDto],
  })
  stacks: StackDto[];

  @ApiProperty({ description: 'Number of results returned' })
  count: number;

  @ApiProperty({ description: 'Total matching stacks (before limit)' })
  totalMatches: number;
}

/**
 * Response for full stacks list (used when no search query)
 */
export class StacksListResponseDto {
  @ApiProperty({
    description: 'Programming languages and frameworks',
    type: [StackDto],
  })
  languages: StackDto[];

  @ApiProperty({
    description: 'Skills and tools',
    type: [StackDto],
  })
  skills: StackDto[];

  @ApiProperty({ description: 'Total number of available stacks' })
  total: number;
}
