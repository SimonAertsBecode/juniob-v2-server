import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class SetInstallationDto {
  @ApiProperty({
    description: 'GitHub App installation ID',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty()
  installationId: string;

  @ApiProperty({
    description: 'Setup action type',
    enum: ['install', 'update'],
    example: 'install',
  })
  @IsString()
  @IsIn(['install', 'update'])
  setupAction: 'install' | 'update';
}
