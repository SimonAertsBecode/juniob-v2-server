import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMaxSize } from 'class-validator';

export class SetPipelineTagsDto {
  @ApiProperty({
    description: 'Array of tag IDs to assign to this pipeline entry',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(10, { message: 'Maximum 10 tags per candidate' })
  tagIds: number[];
}
