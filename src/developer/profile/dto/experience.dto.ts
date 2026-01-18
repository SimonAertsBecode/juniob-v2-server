import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

/**
 * Add or update technology experience
 */
export class SetExperienceDto {
  @ApiProperty({
    description: 'Stack name (must be from the available stacks list)',
    example: 'React.js',
  })
  @IsString()
  @IsNotEmpty()
  stackName: string;

  @ApiProperty({
    description: 'Experience in months (1-120)',
    example: 6,
    minimum: 1,
    maximum: 120,
  })
  @IsInt()
  @Min(1)
  @Max(120) // Max 10 years for junior devs
  months: number;
}

/**
 * Batch set multiple experiences at once
 */
export class SetExperienceBatchDto {
  @ApiProperty({
    description: 'Array of technology experiences to set',
    type: [SetExperienceDto],
  })
  experiences: SetExperienceDto[];
}
