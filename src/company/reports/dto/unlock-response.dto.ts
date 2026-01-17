import { ApiProperty } from '@nestjs/swagger';

export class UnlockReportResponseDto {
  @ApiProperty({ description: 'Whether the unlock was successful' })
  success: boolean;

  @ApiProperty({ description: 'Message describing the result' })
  message: string;

  @ApiProperty({ description: 'New credit balance after unlock' })
  newBalance: number;

  @ApiProperty({ description: 'Developer ID that was unlocked' })
  developerId: number;
}
