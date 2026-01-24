import { ApiProperty } from '@nestjs/swagger';
import { TagDto } from './tag.dto';

/**
 * List of tags for a company
 */
export class TagListDto {
  @ApiProperty({ description: 'List of tags', type: [TagDto] })
  tags: TagDto[];

  @ApiProperty({ description: 'Total number of tags' })
  total: number;
}
