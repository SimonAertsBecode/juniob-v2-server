import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateVisibilityDto {
  @ApiProperty({
    description: 'Whether the developer profile is visible to companies',
    example: true,
  })
  @IsBoolean()
  isVisible: boolean;
}

export class VisibilityResponseDto {
  @ApiProperty({
    description: 'Whether the developer profile is visible to companies',
    example: true,
  })
  isVisible: boolean;

  @ApiProperty({
    description: 'Whether visibility can be toggled (all requirements met)',
    example: true,
  })
  canToggle: boolean;

  @ApiProperty({
    description: 'Reason if visibility cannot be toggled',
    example:
      'Complete your profile and submit at least one project for analysis',
    required: false,
  })
  reason?: string;
}
