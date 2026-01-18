import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsInt, Min } from 'class-validator';

/**
 * DTO for creating a collection
 */
export class CreateCollectionDto {
  @ApiProperty({
    description: 'Collection name',
    example: 'Frontend for GetYourWay',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

/**
 * DTO for updating a collection
 */
export class UpdateCollectionDto {
  @ApiProperty({
    description: 'New collection name',
    example: 'Backend interns',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

/**
 * DTO for adding a developer to a collection
 */
export class AddDeveloperToCollectionDto {
  @ApiProperty({
    description: 'Developer ID to add',
    example: 1,
  })
  @IsInt()
  @Min(1)
  developerId: number;
}
