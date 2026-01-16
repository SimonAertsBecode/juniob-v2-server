import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';

export enum InvitationStatusDto {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  TRACKED = 'TRACKED',
}

export class InvitationResponseDto {
  @ApiProperty({ description: 'Invitation ID', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Candidate email address',
    example: 'developer@example.com',
  })
  @IsString()
  candidateEmail: string;

  @ApiProperty({
    description: 'Invitation status',
    enum: InvitationStatusDto,
    example: InvitationStatusDto.PENDING,
  })
  @IsEnum(InvitationStatusDto)
  status: InvitationStatusDto;

  @ApiProperty({
    description: 'Personal message sent with invitation',
    required: false,
  })
  @IsString()
  @IsOptional()
  message: string | null;

  @ApiProperty({ description: 'When the invitation expires' })
  @IsDateString()
  expiresAt: Date;

  @ApiProperty({ description: 'When email was sent', required: false })
  @IsDateString()
  @IsOptional()
  sentAt: Date | null;

  @ApiProperty({ description: 'When developer accepted', required: false })
  @IsDateString()
  @IsOptional()
  acceptedAt: Date | null;

  @ApiProperty({ description: 'When invitation was created' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Developer ID if registered', required: false })
  @IsNumber()
  @IsOptional()
  developerId: number | null;
}

export class InvitationListDto {
  @ApiProperty({
    description: 'List of invitations',
    type: [InvitationResponseDto],
  })
  invitations: InvitationResponseDto[];

  @ApiProperty({ description: 'Total number of invitations', example: 25 })
  @IsNumber()
  total: number;
}
