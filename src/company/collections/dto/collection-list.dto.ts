import { ApiProperty } from '@nestjs/swagger';
import { CollectionDto } from './collection.dto';

/**
 * List of collections
 */
export class CollectionListDto {
  @ApiProperty({ description: 'Collections', type: [CollectionDto] })
  collections: CollectionDto[];

  @ApiProperty({ description: 'Total number of collections' })
  total: number;
}
