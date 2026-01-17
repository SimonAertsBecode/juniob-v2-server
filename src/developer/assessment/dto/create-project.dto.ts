import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProjectType {
  FRONTEND = 'FRONTEND',
  BACKEND = 'BACKEND',
  FULLSTACK = 'FULLSTACK',
  MOBILE = 'MOBILE',
  OTHER = 'OTHER',
}

export class CreateProjectDto {
  @ApiProperty({
    description: 'Display name for the project',
    example: 'E-commerce Frontend',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'GitHub repository URL',
    example: 'https://github.com/username/repo-name',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/, {
    message: 'GitHub URL must be a valid GitHub repository URL',
  })
  githubUrl: string;

  @ApiProperty({
    description: 'Type of project',
    enum: ProjectType,
    example: ProjectType.FRONTEND,
  })
  @IsEnum(ProjectType)
  projectType: ProjectType;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'A React-based e-commerce frontend with cart functionality',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
